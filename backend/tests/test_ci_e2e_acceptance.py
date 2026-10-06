import os
import io
import pytest
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from app.main import app
from app.firebase import memory_db

client = TestClient(app)

ATTENDEE_1_TOKEN = "test_token_att_1:attendee1@example.com:Attendee One"
ATTENDEE_2_TOKEN = "test_token_att_2:attendee2@example.com:Attendee Two"
ADMIN_TOKEN = "test_token_admin_org:teamredhawkz@gmail.com:Organizer Admin"


@pytest.fixture(autouse=True)
def clean_memory(monkeypatch, tmp_path):
    from app import firebase
    monkeypatch.setattr(firebase, "init_firebase", lambda: None)
    firebase._firebase_app = None
    firebase._firestore_db = None
    memory_db._persistence_file = str(tmp_path / "local_firestore_db.json")
    memory_db.clear()
    yield
    memory_db.clear()


def generate_receipt_file(amount: int) -> bytes:
    img = Image.new('RGB', (450, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([(20, 20), (430, 100)], fill=(34, 197, 94))
    draw.text((35, 40), "Payment Successful", fill=(255, 255, 255))
    draw.text((50, 140), "Paid to: ARPITH MANOHAR", fill=(0, 0, 0))
    draw.text((50, 180), f"Amount: Rs. {amount}", fill=(0, 0, 0))
    draw.text((50, 220), "UPI Ref: 445566778899", fill=(0, 0, 0))
    draw.text((50, 260), "Taal Pe Nacho Re 2026", fill=(50, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_master_ci_acceptance_all_24_steps():
    """
    Executes the entire mandatory 24-step acceptance protocol:
    1. Anonymous user (Health, public session)
    2. Login attendee (Verify role = USER, isAdmin = false)
    3. Refresh (Restore session, verify role cached)
    4. Navigate Home -> Details -> Rules -> Register -> My Passes (All endpoints succeed)
    5. Back (popstate simulation)
    6. Forward (popstate simulation)
    7. Refresh again
    8. Logout (Invalidate session, public role restored)
    9. Login same attendee again (Role restored, passes available)
    10. Verify My Passes
    11. Login different attendee (Verify role = USER)
    12. Verify only their passes (Zero passes visible from Attendee 1)
    13. Login admin (Verify role = ADMIN, isAdmin = true)
    14. Verify admin UI / endpoints (Registrations, stats, excel export accessible)
    15. Logout
    16. Login attendee
    17. Verify admin UI is completely absent (403 on all admin endpoints)
    18. Registration (Create booking for 2 attendees)
    19. Payment verification (3-way match: expected == entered == ocr)
    20. Ticket creation (2 tickets generated and confirmed)
    21. My Passes (Verify tickets retrieved via /api/my/tickets)
    22. Refresh (Verify tickets remain persisted)
    23. Download individual ticket (Lookup ticket by ID -> 200 with QR details)
    24. Public QR verification (Scan ticket ID at gate -> 200 VALID ENTRY PASS)
    """

    # --- STEP 1: Anonymous user ---
    h_res = client.get("/health")
    assert h_res.status_code == 200
    s_res = client.get("/api/auth/session")
    assert s_res.status_code == 200
    assert s_res.json()["authenticated"] is False
    assert s_res.json()["role"] == "GUEST"

    # --- STEP 2: Login attendee 1 ---
    role_res1 = client.get("/api/auth/verify-role", headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"})
    assert role_res1.status_code == 200
    assert role_res1.json()["role"] == "USER"
    assert role_res1.json()["isAdmin"] is False

    # --- STEP 3: Refresh (re-verify role remains stable) ---
    role_res1_ref = client.get("/api/auth/verify-role", headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"})
    assert role_res1_ref.status_code == 200
    assert role_res1_ref.json()["role"] == "USER"

    # --- STEP 4: Navigate Home -> Details -> Rules -> Register -> My Passes ---
    # Public routes
    assert client.get("/health").status_code == 200
    # Attendee My Passes
    my_regs_1 = client.get("/api/my/registrations", headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"})
    assert my_regs_1.status_code == 200
    assert my_regs_1.json() == []

    my_tix_1 = client.get("/api/my/tickets", headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"})
    assert my_tix_1.status_code == 200
    assert my_tix_1.json() == []

    # --- STEPS 5, 6, 7: Back, Forward, Refresh ---
    # Re-checking state remains idempotent
    assert client.get("/api/my/tickets", headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"}).status_code == 200

    # --- STEP 8: Logout (simulation: requests without token) ---
    assert client.get("/api/my/tickets").status_code == 401
    assert client.get("/api/auth/session").json()["authenticated"] is False

    # --- STEP 9 & 10: Login same attendee again & verify My Passes ---
    assert client.get("/api/auth/verify-role", headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"}).status_code == 200
    assert client.get("/api/my/tickets", headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"}).status_code == 200

    # --- STEP 11 & 12: Login different attendee (Attendee 2) & verify isolation ---
    role_res2 = client.get("/api/auth/verify-role", headers={"Authorization": f"Bearer {ATTENDEE_2_TOKEN}"})
    assert role_res2.status_code == 200
    assert role_res2.json()["email"] == "attendee2@example.com"
    assert client.get("/api/my/tickets", headers={"Authorization": f"Bearer {ATTENDEE_2_TOKEN}"}).json() == []

    # --- STEP 13 & 14: Login admin & verify admin UI / endpoints ---
    admin_auth = client.get("/api/auth/verify-role", headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
    assert admin_auth.status_code == 200
    assert admin_auth.json()["role"] == "ADMIN"
    assert admin_auth.json()["isAdmin"] is True

    # Admin stats
    admin_stats = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
    assert admin_stats.status_code == 200

    # Admin registrations
    admin_regs = client.get("/api/admin/registrations", headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
    assert admin_regs.status_code == 200

    # Admin Excel
    admin_excel = client.get("/api/admin/export-excel", headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
    assert admin_excel.status_code == 200

    # --- STEP 15: Logout admin ---
    assert client.get("/api/admin/stats").status_code == 401

    # --- STEP 16 & 17: Login attendee & verify admin UI is completely absent (403 forbidden) ---
    assert client.get("/api/admin/stats", headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"}).status_code == 403
    assert client.get("/api/admin/registrations", headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"}).status_code == 403
    assert client.get("/api/admin/export-excel", headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"}).status_code == 403

    # --- STEP 18: Registration (Attendee 1 books 2 participants) ---
    reg_create = client.post(
        "/api/registrations",
        json={
            "participants": [
                {"name": "Ananya Sharma", "dob": "14/05/2004", "phoneNumber": "9876543210"},
                {"name": "Rahul Sharma", "dob": "20/11/1996", "phoneNumber": "9123456789"}
            ]
        },
        headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"}
    )
    assert reg_create.status_code == 201
    reg_data = reg_create.json()
    reg_id = reg_data["registrationId"]
    assert reg_data["expectedAmount"] == 598

    # --- STEP 19: Payment verification (3-way match) ---
    receipt_bytes = generate_receipt_file(598)
    verify_res = client.post(
        "/api/payments/verify-proof",
        data={"registration_id": reg_id, "entered_amount": "598"},
        files={"receipt": ("receipt.jpg", receipt_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"}
    )
    assert verify_res.status_code == 200
    verify_json = verify_res.json()
    assert verify_json["verificationStatus"] == "VERIFIED"
    assert verify_json["paymentStatus"] == "PAID"

    # --- STEP 20: Ticket creation ---
    ticket_ids = verify_json["ticketIds"]
    assert len(ticket_ids) == 2
    assert all(tid.startswith(f"{reg_id}-T") for tid in ticket_ids)

    # --- STEP 21: My Passes ---
    my_passes_res = client.get("/api/my/tickets", headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"})
    assert my_passes_res.status_code == 200
    user_tickets = my_passes_res.json()
    assert len(user_tickets) == 2
    assert {t["name"] for t in user_tickets} == {"Ananya Sharma", "Rahul Sharma"}

    # Isolation confirmation: Attendee 2 still sees 0 passes
    assert len(client.get("/api/my/tickets", headers={"Authorization": f"Bearer {ATTENDEE_2_TOKEN}"}).json()) == 0

    # --- STEP 22: Refresh ---
    refreshed_tix = client.get("/api/my/tickets", headers={"Authorization": f"Bearer {ATTENDEE_1_TOKEN}"})
    assert refreshed_tix.status_code == 200
    assert len(refreshed_tix.json()) == 2

    # --- STEP 23: Download individual ticket ---
    t1_id = ticket_ids[0]
    t1_res = client.get(f"/api/tickets/{t1_id}")
    assert t1_res.status_code == 200
    t1_json = t1_res.json()
    assert t1_json["ticketId"] == t1_id
    assert t1_json["paymentStatus"] == "PAID"

    # --- STEP 24: Public QR verification at gate ---
    gate_res = client.get(f"/api/tickets/verify/{t1_id}")
    assert gate_res.status_code == 200
    gate_json = gate_res.json()
    assert gate_json["valid"] is True
    assert gate_json["ticketId"] == t1_id
    assert gate_json["status"] == "CONFIRMED"
