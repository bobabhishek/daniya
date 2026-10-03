import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
import io

from app.main import app
from app.firebase import memory_db

client = TestClient(app)

USER_A_TOKEN = "test_token_user_a:usera@example.com:User A"
USER_B_TOKEN = "test_token_user_b:userb@example.com:User B"
ADMIN_TOKEN = "test_token_admin_1:teamredhawkz@gmail.com:Organizer Admin"


@pytest.fixture(autouse=True)
def clean_memory_db():
    memory_db.clear()
    yield


def generate_synthetic_receipt_bytes(amount: int) -> bytes:
    img = Image.new('RGB', (450, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([(20, 20), (430, 100)], fill=(34, 197, 94))
    draw.text((35, 40), "Payment Successful", fill=(255, 255, 255))
    draw.text((50, 140), "Paid to: ARPITH MANOHAR", fill=(0, 0, 0))
    draw.text((50, 180), f"Amount: Rs. {amount}", fill=(0, 0, 0))
    draw.text((50, 220), "UPI Ref: 987654321098", fill=(0, 0, 0))
    draw.text((50, 260), "Taal Pe Nacho Re 2026", fill=(50, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_public_routes_status_codes():
    """Public endpoints should return 200 without authentication."""
    # Health check
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    # Guest session
    res_session = client.get("/api/auth/session")
    assert res_session.status_code == 200
    session_data = res_session.json()
    assert session_data["authenticated"] is False
    assert session_data["role"] == "GUEST"


def test_unauthenticated_requests_return_401():
    """Protected endpoints MUST return HTTP 401 when Authorization header is absent."""
    endpoints = [
        ("GET", "/api/auth/verify-role"),
        ("GET", "/api/my/registrations"),
        ("GET", "/api/my/tickets"),
        ("POST", "/api/registrations"),
        ("GET", "/api/admin/registrations"),
        ("GET", "/api/admin/stats"),
        ("GET", "/api/admin/export-excel"),
    ]

    for method, path in endpoints:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.post(path, json={})
        assert res.status_code == 401, f"{method} {path} should return 401 without auth, got {res.status_code}"


def test_invalid_bearer_token_returns_401():
    """Invalid or corrupted Bearer token returns 401."""
    res = client.get(
        "/api/auth/verify-role",
        headers={"Authorization": "Bearer bad.token.here"}
    )
    assert res.status_code == 401


def test_attendee_cannot_access_admin_endpoints():
    """Attendee token accessing admin endpoints MUST return HTTP 403 Forbidden."""
    admin_paths = [
        "/api/admin/registrations",
        "/api/admin/stats",
        "/api/admin/export-excel"
    ]
    for path in admin_paths:
        res = client.get(path, headers={"Authorization": f"Bearer {USER_A_TOKEN}"})
        assert res.status_code == 403, f"Attendee should be forbidden from {path}, got {res.status_code}"


def test_admin_can_access_admin_endpoints():
    """Admin token accessing admin endpoints MUST return HTTP 200."""
    # Stats
    res_stats = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert "totalRegistrations" in stats
    assert "totalRevenue" in stats

    # Registrations list
    res_regs = client.get("/api/admin/registrations", headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
    assert res_regs.status_code == 200
    assert isinstance(res_regs.json(), list)

    # Master Excel export
    res_excel = client.get("/api/admin/export-excel", headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
    assert res_excel.status_code == 200
    assert res_excel.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def test_complete_attendee_pass_lifecycle_and_user_isolation():
    """
    Test complete attendee flow:
    1. User A books 2 passes.
    2. User A uploads matching receipt (₹598) -> 3-way match -> VERIFIED -> tickets issued.
    3. User A queries /api/my/registrations and /api/my/tickets -> 2 tickets found.
    4. User B queries /api/my/registrations and /api/my/tickets -> 0 tickets found (strict isolation).
    5. Gate verifies User A's ticket ID -> returns 200 with participant details.
    """
    # 1. User A books 2 passes
    create_res = client.post(
        "/api/registrations",
        json={
            "participants": [
                {"name": "Sneha Rao", "dob": "10/08/2002"},
                {"name": "Vikas Rao", "dob": "15/12/1998"}
            ]
        },
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    assert create_res.status_code == 201
    reg_data = create_res.json()
    reg_id = reg_data["registrationId"]
    assert reg_data["expectedAmount"] == 598
    assert reg_data["count"] == 2
    assert reg_data["paymentStatus"] == "PENDING"

    # 2. Payment verification
    receipt_bytes = generate_synthetic_receipt_bytes(598)
    files = {"receipt": ("receipt.jpg", receipt_bytes, "image/jpeg")}
    data = {"registration_id": reg_id, "entered_amount": "598"}

    verify_res = client.post(
        "/api/payments/verify-proof",
        data=data,
        files=files,
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["verificationStatus"] == "VERIFIED"
    assert len(verify_data["ticketIds"]) == 2

    # 3. User A retrieves passes
    user_a_regs = client.get("/api/my/registrations", headers={"Authorization": f"Bearer {USER_A_TOKEN}"})
    assert user_a_regs.status_code == 200
    assert len(user_a_regs.json()) == 1

    user_a_tickets = client.get("/api/my/tickets", headers={"Authorization": f"Bearer {USER_A_TOKEN}"})
    assert user_a_tickets.status_code == 200
    tickets_a = user_a_tickets.json()
    assert len(tickets_a) == 2
    assert {t["name"] for t in tickets_a} == {"Sneha Rao", "Vikas Rao"}

    # 4. User B retrieves passes (isolation check)
    user_b_regs = client.get("/api/my/registrations", headers={"Authorization": f"Bearer {USER_B_TOKEN}"})
    assert user_b_regs.status_code == 200
    assert len(user_b_regs.json()) == 0

    user_b_tickets = client.get("/api/my/tickets", headers={"Authorization": f"Bearer {USER_B_TOKEN}"})
    assert user_b_tickets.status_code == 200
    assert len(user_b_tickets.json()) == 0

    # 5. Public gate QR scan
    t1_id = tickets_a[0]["ticketId"]
    gate_res = client.get(f"/api/tickets/verify/{t1_id}")
    assert gate_res.status_code == 200
    assert gate_res.json()["valid"] is True
    assert gate_res.json()["participantName"] in ("Sneha Rao", "Vikas Rao")
