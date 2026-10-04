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
        with patch("app.firebase.init_firebase"):
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


def test_ocr_financial_text_parsing_formats():
    """
    Automated test suite verifying that OcrService._parse_financial_text correctly handles
    all mandatory Indian UPI and currency format variations:
    - ₹299 -> 299
    - Rs. 299 -> 299
    - Rs 299 -> 299
    - INR 299 -> 299
    - 299 -> 299
    - ₹299.00 -> 299
    - Rs 299.00 -> 299
    - 1,299 -> 1299
    - ₹1,299 -> 1299
    - OCR misreads (n299, B299, ?299)
    """
    from app.services.ocr_service import OcrService

    test_cases = [
        (["₹299"], "₹299", 299),
        (["Rs. 299"], "Rs. 299", 299),
        (["Rs 299"], "Rs 299", 299),
        (["INR 299"], "INR 299", 299),
        (["299"], "299", 299),
        (["₹299.00"], "₹299.00", 299),
        (["Rs 299.00"], "Rs 299.00", 299),
        (["1,299"], "1,299", 1299),
        (["₹1,299"], "₹1,299", 1299),
        (["Paid n299 to Arpith"], "Paid n299 to Arpith", 299),
        (["B299.00"], "B299.00", 299),
        (["?299"], "?299", 299),
    ]

    for lines, full_text, expected_val in test_cases:
        parsed = OcrService._parse_financial_text(lines, full_text, expected_amount=expected_val)
        assert parsed["detected_amount"] == expected_val, (
            f"Failed parsing {full_text!r}: expected {expected_val}, got {parsed['detected_amount']}"
        )


def test_three_way_payment_verification_matrix():
    """
    Tests the authoritative three-way payment verification matrix in PaymentService:
    - expected 299, detected 299, entered 299 -> PASS
    - expected 299, detected 200, entered 299 -> FAIL
    - expected 299, OCR cannot detect (None), entered 299 -> FAIL
    - entered 299 + detected 200 (expected 299) -> FAIL
    - entered 200 + detected 299 (expected 299) -> FAIL
    """
    from app.services.payment_service import PaymentService
    from app.services.registration_service import RegistrationService

    fake_reg = {
        "registrationId": "KD-VERIFY-001",
        "expectedAmount": 299,
        "totalAmount": 299,
        "verificationStatus": "PENDING",
        "paymentStatus": "PENDING",
        "ticketIds": []
    }

    # Case 1: expected 299, detected 299, entered 299 -> PASS
    with patch.object(RegistrationService, "get_registration", return_value=fake_reg):
        with patch.object(RegistrationService, "mark_payment_verified", return_value={"ticketIds": ["T-01"]}):
            with patch("app.services.payment_service.OcrService.process_receipt", return_value={"detected_amount": 299, "confidence": 0.95}):
                with patch("app.services.receipt_storage_service.ReceiptStorageService.save_verified_receipt", return_value="/receipts/KD-VERIFY-001/payment.jpg"):
                    res = PaymentService.verify_payment_receipt("KD-VERIFY-001", entered_amount=299, image_bytes=b"dummy")
                    assert res["success"] is True
                    assert res["verificationStatus"] == "VERIFIED"
                    assert res["paymentStatus"] == "PAID"
                    assert res["ocrAmount"] == 299

    # Case 2: expected 299, detected 200, entered 299 -> FAIL
    with patch.object(RegistrationService, "get_registration", return_value=fake_reg):
        with patch.object(RegistrationService, "mark_payment_failed", return_value=None):
            with patch("app.services.payment_service.OcrService.process_receipt", return_value={"detected_amount": 200, "confidence": 0.95}):
                res = PaymentService.verify_payment_receipt("KD-VERIFY-001", entered_amount=299, image_bytes=b"dummy")
                assert res["success"] is False
                assert res["verificationStatus"] == "FAILED"
                assert res["paymentStatus"] == "PENDING"
                assert res["ocrAmount"] == 200

    # Case 3: expected 299, OCR cannot detect (None), entered 299 -> FAIL
    with patch.object(RegistrationService, "get_registration", return_value=fake_reg):
        with patch.object(RegistrationService, "mark_payment_failed", return_value=None):
            with patch("app.services.payment_service.OcrService.process_receipt", return_value={"detected_amount": None, "confidence": 0.0}):
                res = PaymentService.verify_payment_receipt("KD-VERIFY-001", entered_amount=299, image_bytes=b"dummy")
                assert res["success"] is False
                assert res["verificationStatus"] == "FAILED"
                assert res["ocrAmount"] is None
                assert "could not be verified" in res["mismatchReason"].lower()

    # Case 4: entered amount 299 + detected amount 200 (expected 299) -> FAIL
    with patch.object(RegistrationService, "get_registration", return_value=fake_reg):
        with patch.object(RegistrationService, "mark_payment_failed", return_value=None):
            with patch("app.services.payment_service.OcrService.process_receipt", return_value={"detected_amount": 200, "confidence": 0.95}):
                res = PaymentService.verify_payment_receipt("KD-VERIFY-001", entered_amount=299, image_bytes=b"dummy")
                assert res["success"] is False
                assert res["verificationStatus"] == "FAILED"

    # Case 5: entered amount 200 + detected amount 299 (expected 299) -> FAIL
    with patch.object(RegistrationService, "get_registration", return_value=fake_reg):
        with patch.object(RegistrationService, "mark_payment_failed", return_value=None):
            with patch("app.services.payment_service.OcrService.process_receipt", return_value={"detected_amount": 299, "confidence": 0.95}):
                res = PaymentService.verify_payment_receipt("KD-VERIFY-001", entered_amount=200, image_bytes=b"dummy")
                assert res["success"] is False
                assert res["verificationStatus"] == "FAILED"
                assert "does not match the expected total" in res["mismatchReason"]


