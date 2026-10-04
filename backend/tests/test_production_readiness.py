import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.firebase import verify_id_token, get_db
from app.services.receipt_storage_service import ReceiptStorageService

client = TestClient(app)


def test_production_mode_blocks_mock_tokens():
    """In production mode, test_token_* and mock_token_* must immediately fail."""
    with patch.object(settings, "ENVIRONMENT", "production"):
        with pytest.raises(ValueError, match="strictly forbidden in production"):
            verify_id_token("test_token_user123:user@example.com:User")

        with pytest.raises(ValueError, match="strictly forbidden in production"):
            verify_id_token("mock_token_admin:teamredhawkz@gmail.com:Admin")


def test_production_mode_blocks_local_firestore_fallback():
    """In production mode, get_db() must not silently fall back to local JSON db."""
    with patch.object(settings, "ENVIRONMENT", "production"):
        with patch("app.firebase._firestore_db", None):
            with pytest.raises(RuntimeError, match="strictly disabled in production"):
                get_db()


def test_production_mode_blocks_ephemeral_receipts_without_bucket():
    """In production mode, receipt saving without Cloud Storage must fail fast."""
    with patch.object(settings, "ENVIRONMENT", "production"):
        with patch.object(ReceiptStorageService, "get_firebase_bucket", return_value=None):
            with pytest.raises(RuntimeError, match="Firebase Storage bucket is not available in production mode"):
                ReceiptStorageService.save_verified_receipt("KD-TEST-001", b"fake_image_bytes")


def test_admin_authorization_enforced():
    """Normal user token receives HTTP 403 on admin routes."""
    normal_token = "test_token_regular_user:regular@example.com:Normal User"
    res = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {normal_token}"})
    assert res.status_code == 403
    assert "Organizer administrative privileges required" in res.json().get("detail", "")


def test_admin_account_permitted():
    """The official admin email teamredhawkz@gmail.com receives access to admin routes."""
    admin_token = "test_token_admin_user:teamredhawkz@gmail.com:Admin User"
    res = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "totalRegistrations" in res.json()


def test_ocr_service_process_receipt():
    """Verify OcrService.process_receipt API contract and amount extraction."""
    import io
    from PIL import Image, ImageDraw
    from app.services.ocr_service import OcrService

    # 1. Empty image test
    empty_res = OcrService.process_receipt(b"")
    assert empty_res["detected_amount"] is None
    assert empty_res["confidence"] == 0.0

    # 2. Synthetic receipt with clear amount
    img = Image.new("RGB", (250, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((10, 20), "PAID INR 299", fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    jpeg_bytes = buf.getvalue()

    res = OcrService.process_receipt(jpeg_bytes)
    assert res["detected_amount"] == 299
    assert res["confidence"] > 0.8
    assert "all_detected_numbers" in res
    assert 299 in res["all_detected_numbers"]

