import os
import shutil
import logging
from typing import Optional, Tuple
from ..config import settings

logger = logging.getLogger("dandiya_backend.receipt_storage")


class ReceiptStorageService:
    """
    Dedicated local storage manager for verified event payment receipts.
    
    Structure:
    receipts/
        {registrationId}/
            payment_receipt.jpg
            
    Rule: Failed/unverified receipts must NEVER be stored here.
    """

    @classmethod
    def get_base_dir(cls) -> str:
        """Returns absolute path to the receipts directory."""
        receipts_dir = settings.RECEIPTS_DIR or "receipts"
        if os.path.isabs(receipts_dir):
            return receipts_dir
        # Relative to backend root directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        return os.path.join(backend_dir, receipts_dir)

    @classmethod
    def save_verified_receipt(
        cls,
        registration_id: str,
        image_bytes: bytes,
        filename: str = "payment_receipt.jpg"
    ) -> str:
        """
        Saves verified payment receipt image on disk.
        Enforces:
        1. Save actual uploaded screenshot.
        2. Create registration directory.
        3. Save the image.
        4. Verify file exists on disk and is non-empty.
        Returns relative path format: receipts/{registrationId}/payment_receipt.jpg
        """
        if not image_bytes:
            raise ValueError("Cannot save empty receipt image bytes.")

        reg_dir = os.path.join(cls.get_base_dir(), registration_id)
        os.makedirs(reg_dir, exist_ok=True)

        # Standardize target filename to payment_receipt.jpg
        target_filename = "payment_receipt.jpg"
        file_path = os.path.join(reg_dir, target_filename)

        with open(file_path, "wb") as f:
            f.write(image_bytes)
            f.flush()
            try:
                os.fsync(f.fileno())
            except Exception:
                pass

        # Step 4: Verify the file exists on disk
        if not os.path.isfile(file_path) or os.path.getsize(file_path) == 0:
            raise IOError(f"Verified receipt storage failed: {file_path} is missing or empty.")

        rel_path = f"receipts/{registration_id}/{target_filename}"
        logger.info(f"Verified payment receipt saved & verified locally: {rel_path} ({len(image_bytes)} bytes)")
        return rel_path

    @classmethod
    def get_receipt_path(cls, registration_id_or_path: str) -> Optional[str]:
        """
        Returns absolute file path to verified receipt.
        Accepts registrationId (e.g. 'KD-000001') or relative path (e.g. 'receipts/KD-000001/payment_receipt.jpg').
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

        return None

    @classmethod
    def get_receipt_bytes(cls, registration_id_or_path: str) -> Optional[Tuple[bytes, str]]:
        """
        Reads verified receipt from disk.
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
        """Removes the verified receipt directory for a registration."""
        reg_dir = os.path.join(cls.get_base_dir(), registration_id)
        if os.path.isdir(reg_dir):
            shutil.rmtree(reg_dir, ignore_errors=True)
            logger.info(f"Deleted receipt directory for {registration_id}")
            return True
        return False
