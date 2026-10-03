import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"

import pytest
import io
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from app.main import app
from app.services.pricing_service import PricingService, calculate_age_from_dob
from app.services.id_service import IdService
from app.models.participant import ParticipantInput
from app.firebase import memory_db

client = TestClient(app)

# Helper test tokens
USER_A_TOKEN = "test_token_user_a:usera@example.com:User A"
USER_B_TOKEN = "test_token_user_b:userb@example.com:User B"
ADMIN_TOKEN = "test_token_admin_1:teamredhawkz@gmail.com:Organizer Admin"


@pytest.fixture(autouse=True)
def clean_memory_db():
    memory_db.clear()
    yield


def generate_synthetic_receipt_bytes(amount: int, payee: str = "ARPITH MANOHAR", utr: str = "428172938491") -> bytes:
    """Creates a synthetic UPI receipt image containing the given amount and UTR."""
    img = Image.new('RGB', (450, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([(20, 20), (430, 100)], fill=(34, 197, 94))
    draw.text((35, 40), "Payment Successful", fill=(255, 255, 255))
    draw.text((50, 140), f"Paid to: {payee}", fill=(0, 0, 0))
    draw.text((50, 180), f"Amount: Rs. {amount}", fill=(0, 0, 0))
    draw.text((50, 220), f"UPI Ref: {utr}", fill=(0, 0, 0))
    draw.text((50, 260), "Taal Pe Nacho Re 2026", fill=(50, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_health_check():
    """Verify health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["adminEmail"] == "teamredhawkz@gmail.com"


def test_id_generation():
    """Verify sequential registration and ticket ID formats."""
    reg_id_1 = IdService.get_next_registration_id()
    assert reg_id_1 == "KD-000001"

    reg_id_2 = IdService.get_next_registration_id()
    assert reg_id_2 == "KD-000002"

    t1 = IdService.generate_ticket_id(reg_id_1, 0)
    t2 = IdService.generate_ticket_id(reg_id_1, 1)
    assert t1 == "KD-000001-T01"
    assert t2 == "KD-000001-T02"

    t3 = IdService.generate_ticket_id(reg_id_2, 0)
    assert t3 == "KD-000002-T01"


def test_age_calculation_from_dob():
    """Verify accurate DD/MM/YYYY age calculation."""
    age_18 = calculate_age_from_dob("14/03/2008")
    assert age_18 >= 17 and age_18 <= 19

    age_32 = calculate_age_from_dob("05/11/1994")
    assert age_32 >= 31 and age_32 <= 33


def test_registration_creation_does_not_issue_tickets():
    """
    CRITICAL RULE TEST:
    Tickets MUST NOT be generated before successful payment verification.
    At registration creation time, ticketIds MUST be empty and no tickets exist in DB.
    """
    payload = {
        "participants": [
            {"name": "Participant A", "dob": "14/03/2008", "age": 18},
            {"name": "Participant B", "dob": "05/11/1994", "age": 32},
            {"name": "Participant C", "dob": "22/09/2006", "age": 20}
        ],
        "paymentMethod": "UPI (Official QR)"
    }

    response = client.post(
        "/api/registrations",
        json=payload,
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )

    assert response.status_code == 201
    data = response.json()
    reg_id = data["registrationId"]

    # Verify ONE Master Registration created with expected amount 897 (3 * 299)
    assert data["expectedAmount"] == 897
    assert data["totalAmount"] == 897
    assert data["count"] == 3
    assert data["paymentStatus"] == "PENDING"
    assert data["verificationStatus"] == "PENDING"

    # CONFIRM: Tickets MUST NOT be issued yet!
    assert data["ticketIds"] == []
    # Verify participants in registration do not have ticketId assigned yet
    for p in data["participants"]:
        assert p.get("ticketId") is None

    # Check tickets collection in DB
    ticket_lookup = client.get(f"/api/tickets/{reg_id}-T01")
    assert ticket_lookup.status_code == 404


def test_three_way_amount_match_success():
    """
    TEST THREE-WAY MATCH (SUCCESS):
    1. Expected = ₹897 (3 participants)
    2. Entered = ₹897
    3. OCR = ₹897
    MATCH!
    - Payment marked VERIFIED
    - Google Drive receipt uploaded
    - 3 tickets generated and active
    """
    # 1. Create registration for 3 participants
    payload = {
        "participants": [
            {"name": "Participant A", "dob": "14/03/2008"},
            {"name": "Participant B", "dob": "05/11/1994"},
            {"name": "Participant C", "dob": "22/09/2006"}
        ]
    }
    create_res = client.post(
        "/api/registrations",
        json=payload,
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    reg_id = create_res.json()["registrationId"]

    # 2. Upload matching receipt (₹897) and enter ₹897
    receipt_bytes = generate_synthetic_receipt_bytes(897)
    files = {"receipt": ("gpay_receipt.jpg", receipt_bytes, "image/jpeg")}
    data = {"registration_id": reg_id, "entered_amount": "897"}

    verify_res = client.post(
        "/api/payments/verify-proof",
        data=data,
        files=files,
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )

    assert verify_res.status_code == 200
    res_data = verify_res.json()
    assert res_data["success"] is True
    assert res_data["paymentStatus"] == "PAID"
    assert res_data["verificationStatus"] == "VERIFIED"
    assert res_data["expectedAmount"] == 897
    assert res_data["enteredAmount"] == 897
    assert res_data["ocrAmount"] == 897
    assert len(res_data["ticketIds"]) == 3
    assert res_data["receiptPath"] is not None

    # Verify tickets are now discoverable and valid at entry gate
    t1_res = client.get(f"/api/tickets/{res_data['ticketIds'][0]}")
    assert t1_res.status_code == 200
    assert t1_res.json()["paymentStatus"] == "PAID"


def test_three_way_mismatch_user_entered_wrong_amount():
    """
    TEST FAILED EXAMPLE 1:
    Expected = ₹897
    User Entered = ₹299 (wrong)
    OCR = ₹897
    Mismatch -> REJECT, NO tickets, NO Google Drive storage.
    """
    create_res = client.post(
        "/api/registrations",
        json={"participants": [{"name": f"P{i}", "dob": "01/01/2000"} for i in range(3)]},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    reg_id = create_res.json()["registrationId"]

    receipt_bytes = generate_synthetic_receipt_bytes(897)
    files = {"receipt": ("receipt.jpg", receipt_bytes, "image/jpeg")}
    data = {"registration_id": reg_id, "entered_amount": "299"}  # User entered 299 instead of 897

    verify_res = client.post(
        "/api/payments/verify-proof",
        data=data,
        files=files,
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )

    assert verify_res.status_code == 200
    res_data = verify_res.json()
    assert res_data["success"] is False
    assert res_data["verificationStatus"] == "FAILED"
    assert res_data["ticketIds"] == []
    assert "Entered" in res_data["mismatchReason"] or "entered" in res_data["mismatchReason"]

    # Verify NO tickets were generated
    lookup = client.get(f"/api/tickets/{reg_id}-T01")
    assert lookup.status_code == 404


def test_three_way_mismatch_ocr_wrong_amount():
    """
    TEST FAILED EXAMPLE 2:
    Expected = ₹897
    User Entered = ₹897
    OCR = ₹299 (user uploaded old/wrong receipt)
    Mismatch -> REJECT, NO tickets, NO Google Drive storage.
    """
    create_res = client.post(
        "/api/registrations",
        json={"participants": [{"name": f"P{i}", "dob": "01/01/2000"} for i in range(3)]},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    reg_id = create_res.json()["registrationId"]

    # Receipt image only shows ₹299
    receipt_bytes = generate_synthetic_receipt_bytes(299)
    files = {"receipt": ("wrong_receipt.jpg", receipt_bytes, "image/jpeg")}
    data = {"registration_id": reg_id, "entered_amount": "897"}

    verify_res = client.post(
        "/api/payments/verify-proof",
        data=data,
        files=files,
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )

    assert verify_res.status_code == 200
    res_data = verify_res.json()
    assert res_data["success"] is False
    assert res_data["verificationStatus"] == "FAILED"
    assert res_data["ocrAmount"] == 299
    assert res_data["expectedAmount"] == 897
    assert res_data["ticketIds"] == []


def test_ocr_failure_on_unreadable_image():
    """
    TEST OCR FAILURE:
    Image with no recognizable financial numbers
    Must show clearer screenshot required, no tickets issued.
    """
    create_res = client.post(
        "/api/registrations",
        json={"participants": [{"name": "Attendee", "dob": "01/01/2000"}]},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    reg_id = create_res.json()["registrationId"]

    # Plain blank image
    img = Image.new('RGB', (200, 200), color=(240, 240, 240))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    files = {"receipt": ("blank.jpg", buf.getvalue(), "image/jpeg")}
    data = {"registration_id": reg_id, "entered_amount": "299"}

    verify_res = client.post(
        "/api/payments/verify-proof",
        data=data,
        files=files,
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )

    assert verify_res.status_code == 200
    res_data = verify_res.json()
    assert res_data["success"] is False
    assert res_data["verificationStatus"] == "FAILED"
    assert "clearer screenshot" in res_data["mismatchReason"]


def test_admin_can_view_verified_receipt():
    """
    Admin can retrieve verified receipt from local storage via backend:
    GET /api/admin/registrations/{id}/receipt
    """
    # 1. Create and verify booking
    create_res = client.post(
        "/api/registrations",
        json={"participants": [{"name": "Attendee", "dob": "01/01/2000"}]},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    reg_id = create_res.json()["registrationId"]
    receipt_bytes = generate_synthetic_receipt_bytes(299)

    client.post(
        "/api/payments/verify-proof",
        data={"registration_id": reg_id, "entered_amount": "299"},
        files={"receipt": ("receipt.jpg", receipt_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )

    # 2. Admin retrieves receipt
    receipt_get = client.get(
        f"/api/admin/registrations/{reg_id}/receipt",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
    )
    assert receipt_get.status_code == 200
    assert len(receipt_get.content) > 0

    # 3. Non-admin forbidden
    user_get = client.get(
        f"/api/admin/registrations/{reg_id}/receipt",
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    assert user_get.status_code == 403


def test_user_my_passes_and_my_tickets():
    """Verify /api/my/registrations and /api/my/tickets return verified records for authenticated user."""
    # 1. Create and verify booking for User A
    create_res = client.post(
        "/api/registrations",
        json={"participants": [{"name": "Kamath Abhishek", "dob": "15/05/2001"}]},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    reg_id = create_res.json()["registrationId"]
    assert reg_id.startswith("KD-")

    # Complete payment
    receipt_bytes = generate_synthetic_receipt_bytes(299)
    client.post(
        "/api/payments/verify-proof",
        data={"registration_id": reg_id, "entered_amount": "299"},
        files={"receipt": ("receipt.jpg", receipt_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )

    # 2. Query /api/my/registrations as User A
    my_regs_res = client.get(
        "/api/my/registrations",
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    assert my_regs_res.status_code == 200
    my_regs = my_regs_res.json()
    assert len(my_regs) >= 1
    assert any(r["registrationId"] == reg_id for r in my_regs)

    # 3. Query /api/my/tickets as User A
    my_tickets_res = client.get(
        "/api/my/tickets",
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    assert my_tickets_res.status_code == 200
    my_tickets = my_tickets_res.json()
    assert len(my_tickets) >= 1
    user_ticket = next(t for t in my_tickets if t["registrationId"] == reg_id)
    assert user_ticket["ticketId"] == f"{reg_id}-T01"
    assert user_ticket["name"] == "Kamath Abhishek"
    assert user_ticket["paymentStatus"] == "PAID"

    # 4. User B cannot see User A's tickets
    user_b_tickets = client.get(
        "/api/my/tickets",
        headers={"Authorization": f"Bearer {USER_B_TOKEN}"}
    )
    assert user_b_tickets.status_code == 200
    assert not any(t["registrationId"] == reg_id for t in user_b_tickets.json())


def test_missing_receipt_returns_receipt_unavailable():
    """Verify 404 with 'Receipt unavailable' detail when physical file does not exist on disk."""
    # Create booking without uploading receipt
    create_res = client.post(
        "/api/registrations",
        json={"participants": [{"name": "No Receipt Attendee", "dob": "01/01/2000"}]},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    reg_id = create_res.json()["registrationId"]
    
    # Ensure no residual receipt from previous tests
    from app.services.receipt_storage_service import ReceiptStorageService
    ReceiptStorageService.delete_receipt(reg_id)

    # Admin requests receipt
    receipt_get = client.get(
        f"/api/admin/registrations/{reg_id}/receipt",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
    )
    assert receipt_get.status_code == 404
    assert receipt_get.json()["detail"] == "Receipt unavailable"


def test_auth_verify_role_admin_and_user():
    """Verify /api/auth/verify-role authoritatively returns ADMIN for admin and USER for normal attendee."""
    # 1. Admin verification
    admin_auth = client.get(
        "/api/auth/verify-role",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
    )
    assert admin_auth.status_code == 200
    admin_data = admin_auth.json()
    assert admin_data["role"] == "ADMIN"
    assert admin_data["isAdmin"] is True
    assert "view_all_registrations" in admin_data["permissions"]

    # 2. Attendee verification
    user_auth = client.get(
        "/api/auth/verify-role",
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    assert user_auth.status_code == 200
    user_data = user_auth.json()
    assert user_data["role"] == "USER"
    assert user_data["isAdmin"] is False
    assert "view_all_registrations" not in user_data["permissions"]


def test_public_gate_qr_ticket_verification():
    """Verify /api/tickets/verify/{ticket_id} returns VALID ENTRY PASS for verified tickets and 404 for invalid."""
    # 1. Create and verify a ticket
    create_res = client.post(
        "/api/registrations",
        json={"participants": [{"name": "Gate Test Attendee", "dob": "01/01/2000"}]},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    reg_id = create_res.json()["registrationId"]
    receipt_bytes = generate_synthetic_receipt_bytes(299)
    verify_res = client.post(
        "/api/payments/verify-proof",
        data={"registration_id": reg_id, "entered_amount": "299"},
        files={"receipt": ("receipt.jpg", receipt_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    ticket_id = verify_res.json()["ticketIds"][0]

    # 2. Gate scans QR
    gate_res = client.get(f"/api/tickets/verify/{ticket_id}")
    assert gate_res.status_code == 200
    gate_data = gate_res.json()
    assert gate_data["valid"] is True
    assert gate_data["ticketId"] == ticket_id
    assert gate_data["participantName"] == "Gate Test Attendee"
    assert gate_data["paymentStatus"] == "PAID"
    assert gate_data["status"] == "CONFIRMED"

    # 3. Invalid ticket
    fake_res = client.get("/api/tickets/verify/KD-999999-T99")
    assert fake_res.status_code == 404
    assert fake_res.json()["detail"] == "Ticket KD-999999-T99 not found"


def test_standard_online_pricing_for_under_20():
    """Verify standard online price remains ₹299 even when age <= 20."""
    from app.services.pricing_service import PricingService
    from app.models.participant import ParticipantInput

    # 18-year-old participant
    p = ParticipantInput(name="Young Dancer", dob="01/01/2008")
    breakdown = PricingService.calculate_breakdown([p], apply_student_discount=False)
    assert breakdown["total_amount"] == 299
    assert breakdown["participant_details"][0]["category"] in ("STUDENT", "UNDER_20")
    assert breakdown["participant_details"][0]["price"] == 299


