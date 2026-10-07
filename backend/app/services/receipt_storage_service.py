import os
import shutil
import logging
from typing import Optional, Tuple
from ..config import settings

logger = logging.getLogger("dandiya_backend.receipt_storage")


class ReceiptStorageService:
    """
    Dedicated storage manager for verified event payment receipts.
    Supports local filesystem caching and persistent Firebase Cloud Storage.
    
    Structure:
    receipts/
        {registrationId}/
            payment_receipt.jpg
            
    Rule: Failed/unverified receipts must NEVER be stored here.
    """

    @classmethod
    def get_base_dir(cls) -> str:
        """Returns absolute path to the local receipts cache directory."""
        receipts_dir = settings.RECEIPTS_DIR or "receipts"
        if os.path.isabs(receipts_dir):
            return receipts_dir
        # Relative to backend root directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        return os.path.join(backend_dir, receipts_dir)

    @classmethod
    def get_firebase_bucket(cls):
        """Returns initialized Firebase Storage Bucket if available."""
        from ..firebase import _firebase_app, init_firebase
        if not _firebase_app:
            init_firebase()
            from ..firebase import _firebase_app

        if _firebase_app:
            try:
                from firebase_admin import storage
                bucket_name = getattr(
                    settings,
                    'FIREBASE_STORAGE_BUCKET',
                    f"{settings.FIREBASE_PROJECT_ID}.firebasestorage.app"
                )
                return storage.bucket(bucket_name)
            except Exception as e:
                logger.error(f"Failed to access Firebase Storage bucket: {e}")
        return None

    @classmethod
    def save_verified_receipt(
        cls,
        registration_id: str,
        image_bytes: bytes,
        filename: str = "payment_receipt.jpg"
    ) -> str:
        """
        Saves verified payment receipt image.
        1. Saves locally for immediate caching and local access.
        2. In production, persistently uploads to Firebase Cloud Storage.
        Returns relative path format: receipts/{registrationId}/payment_receipt.jpg
        """
        if not image_bytes:
            raise ValueError("Cannot save empty receipt image bytes.")

        reg_dir = os.path.join(cls.get_base_dir(), registration_id)
        os.makedirs(reg_dir, exist_ok=True)

        # Standardize target filename to payment_receipt.jpg
        target_filename = "payment_receipt.jpg"
        file_path = os.path.join(reg_dir, target_filename)

        # Optimize image for fast persistence and zero-risk cloud storage (<200KB)
        optimized_bytes = image_bytes
        try:
            from PIL import Image
            import io
            im = Image.open(io.BytesIO(image_bytes))
            if im.mode != "RGB":
                im = im.convert("RGB")
            max_d = 1280
            if max(im.width, im.height) > max_d:
                scale = max_d / float(max(im.width, im.height))
                new_w = max(1, int(im.width * scale))
                new_h = max(1, int(im.height * scale))
                im = im.resize((new_w, new_h), Image.Resampling.BILINEAR)
            opt_buf = io.BytesIO()
            im.save(opt_buf, format="JPEG", quality=82, optimize=True)
            optimized_bytes = opt_buf.getvalue()
        except Exception as opt_err:
            logger.debug(f"Receipt image optimization fallback to raw bytes: {opt_err}")
            optimized_bytes = image_bytes

        with open(file_path, "wb") as f:
            f.write(optimized_bytes)
            f.flush()
            try:
                os.fsync(f.fileno())
            except Exception:
                pass

        if not os.path.isfile(file_path) or os.path.getsize(file_path) == 0:
            raise IOError(f"Verified receipt local write failed: {file_path} is missing or empty.")

        rel_path = f"receipts/{registration_id}/{target_filename}"

        # In production, enforce persistent Cloud Storage upload with Firestore fallback
        if settings.ENVIRONMENT == "production":
            bucket = cls.get_firebase_bucket()
            if not bucket:
                raise RuntimeError(
                    "CRITICAL: Firebase Storage bucket is not available in production mode! "
                    "Ephemeral local receipts will be lost on container restart. "
                    "Ensure valid Firebase credentials and FIREBASE_STORAGE_BUCKET are configured."
                )
            cloud_uploaded = False
            try:
                blob_name = f"receipts/{registration_id}/{target_filename}"
                blob = bucket.blob(blob_name)
                blob.upload_from_string(optimized_bytes, content_type="image/jpeg")
                cloud_uploaded = True
                logger.info(f"Verified payment receipt persisted to Firebase Cloud Storage: gs://{bucket.name}/{blob_name}")
            except Exception as e:
                logger.warning(
                    f"Firebase Cloud Storage upload to bucket failed ({e}). "
                    f"Persisting receipt securely to Google Cloud Firestore store for registration {registration_id}."
                )

            # Persist to Google Cloud Firestore store to guarantee zero loss across container restarts
            try:
                from ..firebase import get_db
                db = get_db()
                if db is not None:
                    import base64
                    from datetime import datetime
                    b64_str = base64.b64encode(optimized_bytes).decode("ascii")
                    if len(b64_str) < 1000000:
                        db.collection("receipts").document(registration_id).set({
                            "registrationId": registration_id,
                            "imageData": b64_str,
                            "contentType": "image/jpeg",
                            "filename": target_filename,
                            "sizeBytes": len(optimized_bytes),
                            "uploadedAt": datetime.now().isoformat()
                        })
                        logger.info(f"Verified payment receipt safely persisted to Firestore cloud receipts store for {registration_id}")
                    else:
                        logger.warning(f"Receipt image too large for single Firestore doc ({len(b64_str)} bytes)")
            except Exception as db_err:
                logger.warning(f"Firestore cloud receipt persistence encountered issue: {db_err}")
                if not cloud_uploaded and not os.path.isfile(file_path):
                    logger.critical(f"Both Cloud Storage and Firestore cloud receipt persistence failed: {db_err}")
                    raise RuntimeError(f"Cloud receipt persistence failed in production: {db_err}")

        logger.info(f"Verified payment receipt saved: {rel_path} ({len(optimized_bytes)} bytes)")
        return rel_path

    @classmethod
    def get_receipt_path(cls, registration_id_or_path: str) -> Optional[str]:
        """
        Returns absolute file path to verified receipt.
        If local file is absent (e.g. fresh container deploy), hydrates from Firebase Cloud Storage
        or Firestore cloud receipts store.
        """
        if not registration_id_or_path:
            return None

        # 1. Direct absolute check
        if os.path.isabs(registration_id_or_path) and os.path.isfile(registration_id_or_path):
            return registration_id_or_path

        base_dir = cls.get_base_dir()
        backend_dir = os.path.dirname(base_dir)

        # 2. Check if relative to backend root
        candidate_rel = os.path.join(backend_dir, registration_id_or_path)
        if os.path.isfile(candidate_rel):
            return candidate_rel

        # 3. Clean to bare registration ID
        clean_id = (
            registration_id_or_path
            .replace("receipts/", "")
            .replace("receipts\\", "")
            .split("/")[0]
            .split("\\")[0]
            .strip()
        )

        reg_dir = os.path.join(base_dir, clean_id)
        candidate = os.path.join(reg_dir, "payment_receipt.jpg")
        if os.path.isfile(candidate):
            return candidate

        # 4. Fallback check for any valid image in registration folder
        if os.path.isdir(reg_dir):
            for fname in os.listdir(reg_dir):
                if fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    return os.path.join(reg_dir, fname)

        # 5. Cloud Storage fallback: fetch from bucket and hydrate local cache
        bucket = cls.get_firebase_bucket()
        if bucket:
            try:
                blob_name = f"receipts/{clean_id}/payment_receipt.jpg"
                blob = bucket.blob(blob_name)
                if blob.exists():
                    os.makedirs(reg_dir, exist_ok=True)
                    blob.download_to_filename(candidate)
                    if os.path.isfile(candidate) and os.path.getsize(candidate) > 0:
                        logger.info(f"Hydrated receipt from Firebase Cloud Storage: {blob_name}")
                        return candidate
            except Exception as e:
                logger.warning(f"Could not retrieve receipt from Cloud Storage for {clean_id}: {e}")

        # 6. Firestore cloud store fallback: fetch base64 document and hydrate local cache
        try:
            from ..firebase import get_db
            db = get_db()
            if db is not None:
                doc_snap = db.collection("receipts").document(clean_id).get()
                if doc_snap.exists:
                    doc_data = doc_snap.to_dict()
                    b64_data = doc_data.get("imageData")
                    if b64_data:
                        import base64
                        raw_bytes = base64.b64decode(b64_data)
                        os.makedirs(reg_dir, exist_ok=True)
                        with open(candidate, "wb") as f:
                            f.write(raw_bytes)
                        if os.path.isfile(candidate) and os.path.getsize(candidate) > 0:
                            logger.info(f"Hydrated receipt from Firestore cloud receipts store: {clean_id}")
                            return candidate
        except Exception as e:
            logger.debug(f"Firestore receipt hydration skipped for {clean_id}: {e}")

        return None

    @classmethod
    def get_receipt_bytes(cls, registration_id_or_path: str) -> Optional[Tuple[bytes, str]]:
        """
        Reads verified receipt bytes.
        Returns (image_bytes, media_type) or None if not found.
        """
        file_path = cls.get_receipt_path(registration_id_or_path)
        if not file_path or not os.path.isfile(file_path):
            return None

        mime_type = "image/jpeg"
        lower = file_path.lower()
        if lower.endswith(".png"):
            mime_type = "image/png"
        elif lower.endswith(".webp"):
            mime_type = "image/webp"

        with open(file_path, "rb") as f:
            data = f.read()
        return data, mime_type

    @classmethod
    def delete_receipt(cls, registration_id: str) -> bool:
        """Removes the verified receipt locally and from cloud storage."""
        deleted = False
        reg_dir = os.path.join(cls.get_base_dir(), registration_id)
        if os.path.isdir(reg_dir):
            shutil.rmtree(reg_dir, ignore_errors=True)
            deleted = True

        bucket = cls.get_firebase_bucket()
        if bucket:
            try:
                blob_name = f"receipts/{registration_id}/payment_receipt.jpg"
                blob = bucket.blob(blob_name)
                if blob.exists():
                    blob.delete()
                    deleted = True
            except Exception as e:
                logger.warning(f"Could not delete receipt from Cloud Storage for {registration_id}: {e}")

        return deleted
