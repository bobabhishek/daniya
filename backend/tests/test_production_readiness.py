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


def test_production_public_url_is_normalized_without_blocking_startup():
    """Production should not crash startup on a localhost default; it should normalize to the public hosting URL."""
    with patch.object(settings, "ENVIRONMENT", "production"):
        with patch.object(settings, "PUBLIC_APP_URL", "http://localhost:5173", create=True):
            settings.validate_production_requirements()
            assert settings.PUBLIC_APP_URL.startswith("https://")


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


def test_ocr_provider_toggle_prefers_selected_backend(monkeypatch):
    """Hosted HF remains the active OCR provider and ignores legacy local-only toggles."""
    from app.config import settings
    from app.services import ocr_service

    monkeypatch.setattr(settings, "OCR_PROVIDER", "legacy_local", raising=False)
    monkeypatch.setattr(settings, "HF_TOKEN", "token123", raising=False)
    monkeypatch.setattr(ocr_service.HuggingFaceHostedOCRProvider, "extract_text", staticmethod(lambda image_bytes: "Paid Rs. 299"), raising=False)

    result = ocr_service.OcrService.process_receipt(b"dummy", expected_amount=299)
    assert result["detected_amount"] == 299

    monkeypatch.setattr(settings, "OCR_PROVIDER", "huggingface", raising=False)
    result = ocr_service.OcrService.process_receipt(b"dummy", expected_amount=299)
    assert result["detected_amount"] == 299


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


def test_multiple_attendee_totals_matrix():
    """
    Authoritative test suite verifying multiple attendee expected totals:
    - 1 attendee  = ₹299
    - 2 attendees = ₹598
    - 3 attendees = ₹897
    - 4 attendees = ₹1,196
    - 5 attendees = ₹1,495
    - 10 attendees = ₹2,990

    Tests PASS for matching triplets and FAIL for mismatches.
    """
    from app.services.payment_service import PaymentService
    from app.services.registration_service import RegistrationService

    pass_cases = [
        (299, 299, 299),
        (598, 598, 598),
        (897, 897, 897),
        (1196, 1196, 1196),
        (1495, 1495, 1495),
        (2990, 2990, 2990),
    ]

    for expected, detected, entered in pass_cases:
        reg = {
            "registrationId": f"KD-ATT-{expected}",
            "expectedAmount": expected,
            "totalAmount": expected,
            "verificationStatus": "PENDING",
            "paymentStatus": "PENDING",
            "ticketIds": []
        }
        with patch.object(RegistrationService, "get_registration", return_value=reg):
            with patch.object(RegistrationService, "mark_payment_verified", return_value={"ticketIds": ["T-01"]}):
                with patch("app.services.payment_service.OcrService.process_receipt", return_value={"detected_amount": detected, "confidence": 0.95}):
                    with patch("app.services.receipt_storage_service.ReceiptStorageService.save_verified_receipt", return_value=f"/receipts/KD-ATT-{expected}/pay.jpg"):
                        res = PaymentService.verify_payment_receipt(f"KD-ATT-{expected}", entered_amount=entered, image_bytes=b"dummy")
                        assert res["success"] is True, f"Failed for {expected}"
                        assert res["verificationStatus"] == "VERIFIED"
                        assert res["paymentStatus"] == "PAID"
                        assert res["ocrAmount"] == detected

    fail_cases = [
        (598, 299, 598),  # Expected 598 + detected 299 + entered 598 -> FAIL
        (598, 897, 598),  # Expected 598 + detected 897 + entered 598 -> FAIL
        (897, 598, 897),  # Expected 897 + detected 598 + entered 897 -> FAIL
    ]

    for expected, detected, entered in fail_cases:
        reg = {
            "registrationId": f"KD-ATT-FAIL-{expected}",
            "expectedAmount": expected,
            "totalAmount": expected,
            "verificationStatus": "PENDING",
            "paymentStatus": "PENDING",
            "ticketIds": []
        }
        with patch.object(RegistrationService, "get_registration", return_value=reg):
            with patch.object(RegistrationService, "mark_payment_failed", return_value=None):
                with patch("app.services.payment_service.OcrService.process_receipt", return_value={"detected_amount": detected, "confidence": 0.95}):
                    res = PaymentService.verify_payment_receipt(f"KD-ATT-FAIL-{expected}", entered_amount=entered, image_bytes=b"dummy")
                    assert res["success"] is False, f"Expected failure for {expected} vs {detected}"
                    assert res["verificationStatus"] == "FAILED"
                    assert res["paymentStatus"] == "PENDING"
                    assert res["ocrAmount"] == detected


def test_ocr_multiple_numbers_disambiguation():
    """
    CRITICAL CASE: When a receipt contains individual attendee breakdown numbers,
    transaction IDs, dates, and times, OCR MUST select the expected total amount,
    and NOT the first sub-item or timestamp.
    """
    from app.services.ocr_service import OcrService

    # 1. Expected ₹598 receipt with breakdown [299, 299, 598, utr, date, time]
    lines_598 = [
        "Taal Pe Nacho Re 2026",
        "Pass 1: 299",
        "Pass 2: 299",
        "Total Paid: 598",
        "UPI Ref No: 427819283719",
        "04/10/2026, 18:45 PM"
    ]
    raw_598 = "\n".join(lines_598)
    res_598 = OcrService._parse_financial_text(lines_598, raw_598, expected_amount=598)
    assert res_598["detected_amount"] == 598, f"Expected 598, got {res_598['detected_amount']}"
    assert 299 in res_598["all_detected_numbers"]
    assert 598 in res_598["all_detected_numbers"]

    # 2. Expected ₹897 receipt with [299, 299, 299, 897]
    lines_897 = [
        "Arpith Manohar",
        "Pass 1: 299",
        "Pass 2: 299",
        "Pass 3: 299",
        "Paid: ₹897",
        "Transaction ID: T2610041845"
    ]
    raw_897 = "\n".join(lines_897)
    res_897 = OcrService._parse_financial_text(lines_897, raw_897, expected_amount=897)
    assert res_897["detected_amount"] == 897, f"Expected 897, got {res_897['detected_amount']}"

    # 3. Expected ₹1,196 receipt with [299, 299, 299, 299, 1196]
    lines_1196 = [
        "Pass 1: 299",
        "Pass 2: 299",
        "Pass 3: 299",
        "Pass 4: 299",
        "Total: ₹1,196.00"
    ]
    raw_1196 = "\n".join(lines_1196)
    res_1196 = OcrService._parse_financial_text(lines_1196, raw_1196, expected_amount=1196)
    assert res_1196["detected_amount"] == 1196, f"Expected 1196, got {res_1196['detected_amount']}"


def test_ocr_realistic_multiple_attendee_formats():
    """
    Test realistic OCR text strings for attendee totals:
    - Paid ₹598
    - Rs. 598.00
    - INR 598
    - Paid ₹897
    - ₹1,196
    - ₹1,495
    - ₹2,990
    """
    from app.services.ocr_service import OcrService

    cases = [
        ("Paid ₹598", 598),
        ("Rs. 598.00", 598),
        ("INR 598", 598),
        ("Paid ₹897", 897),
        ("₹1,196", 1196),
        ("₹1,495", 1495),
        ("₹2,990", 2990),
    ]

    for text, expected in cases:
        parsed = OcrService._parse_financial_text([text], text, expected_amount=expected)
        assert parsed["detected_amount"] == expected, f"Failed for {text!r}: expected {expected}, got {parsed['detected_amount']}"


def test_hf_ocr_provider_success_and_multiple_attendee_total_selection(monkeypatch):
    """Hosted HF OCR should read a receipt and preserve the total amount selection rule."""
    from unittest.mock import MagicMock
    from app.services.ocr_service import OcrService
    from app.config import settings

    monkeypatch.setattr(settings, "HF_TOKEN", "hf_test_token", raising=False)

    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "choices": [{
            "message": {
                "content": "Pass 1: 299\nPass 2: 299\nTotal Paid: ₹598\nUPI Ref: 123456789012"
            }
        }]
    }

    with patch("app.services.ocr_service.httpx.Client.post", return_value=mock_response) as mock_post:
        result = OcrService.process_receipt(b"fake-bytes", expected_amount=598)

    assert result["detected_amount"] == 598
    assert result["upi_reference"] == "123456789012"
    assert mock_post.call_count == 1


def test_hf_ocr_provider_timeout_and_error_are_rejected_safely(monkeypatch):
    """Hosted OCR errors and timeouts must fail closed without trusting user-entered amounts."""
    from unittest.mock import MagicMock
    from app.config import settings
    from app.services.ocr_service import OcrService
    import httpx

    monkeypatch.setattr(settings, "HF_TOKEN", "hf_test_token", raising=False)

    with patch("app.services.ocr_service.httpx.Client.post", side_effect=httpx.TimeoutException("timed out")):
        result = OcrService.process_receipt(b"fake-bytes", expected_amount=299)
        assert result["detected_amount"] is None
        assert result["confidence"] == 0.0

    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "bad gateway",
        request=MagicMock(),
        response=MagicMock(status_code=502),
    )
    with patch("app.services.ocr_service.httpx.Client.post", return_value=mock_response):
        result = OcrService.process_receipt(b"fake-bytes", expected_amount=299)
        assert result["detected_amount"] is None
        assert result["confidence"] == 0.0


def test_hf_ocr_requires_token_for_provider(monkeypatch):
    """Hosted OCR must fail closed when the server-side token is missing and fallback is disabled."""
    from app.config import settings
    from app.services.ocr_service import OcrService

    monkeypatch.setattr(settings, "HF_TOKEN", "", raising=False)
    monkeypatch.setattr(settings, "HF_OCR_USE_LOCAL_FALLBACK", False, raising=False)
    result = OcrService.process_receipt(b"fake-bytes", expected_amount=299)
    assert result["detected_amount"] is None
    assert result["confidence"] == 0.0



