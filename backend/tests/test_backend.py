import pytest
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


def test_health_check():
    """Verify health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["adminEmail"] == "teamredhawkz@gmail.com"


def test_id_generation():
    """Verify registration and ticket ID formats."""
    reg_id = IdService.generate_registration_id()
    assert reg_id.startswith("KD-")
    assert len(reg_id) == 9  # e.g. KD-123456

    t1 = IdService.generate_ticket_id(reg_id, 0)
    t2 = IdService.generate_ticket_id(reg_id, 1)
    assert t1 == f"{reg_id}-T01"
    assert t2 == f"{reg_id}-T02"


def test_age_calculation_from_dob():
    """Verify accurate DD/MM/YYYY age calculation."""
    # Assuming today is around 2026
    age_18 = calculate_age_from_dob("14/03/2008")
    assert age_18 >= 17 and age_18 <= 19

    age_32 = calculate_age_from_dob("05/11/1994")
    assert age_32 >= 31 and age_32 <= 33


def test_registration_example_three_different_ages():
    """
    REQUIRED TEST CASE 1:
    Participant A → age 18
    Participant B → age 32
    Participant C → age 20
    Verify that:
    - ONE registration is created.
    - It contains 3 participants.
    - It contains 3 individual tickets.
    - The backend correctly calculates/validates the amount (3 * 299 = 897 under standard current pricing).
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

    # Verify ONE Master Registration
    assert "registrationId" in data
    assert data["registrationId"].startswith("KD-")
    assert data["userEmail"] == "usera@example.com"
    assert data["userId"] == "user_a"

    # Verify 3 participants
    assert len(data["participants"]) == 3
    assert data["participantCount"] == 3
    assert data["count"] == 3

    # Verify counts: A(18) and C(20) <= 20 (2 under 20); B(32) > 20 (1 above 20)
    assert data["under20Count"] == 2
    assert data["above20Count"] == 1

    # Verify standard current pricing: 3 * 299 = 897
    assert data["totalAmount"] == 897
    assert data["amount"] == 897

    # Verify 3 individual tickets issued in PENDING status
    assert len(data["ticketIds"]) == 3
    assert data["ticketIds"][0] == f"{data['registrationId']}-T01"
    assert data["ticketIds"][1] == f"{data['registrationId']}-T02"
    assert data["ticketIds"][2] == f"{data['registrationId']}-T03"

    assert data["paymentStatus"] == "PENDING"
    assert data["registrationStatus"] == "PENDING"


def test_registration_example_all_under_20():
    """
    REQUIRED TEST CASE 2:
    Participant A → 20
    Participant B → 20
    Participant C → 20
    Verify that it remains ONE registration with THREE participants.
    """
    payload = {
        "participants": [
            {"name": "Student A", "dob": "01/01/2006", "age": 20},
            {"name": "Student B", "dob": "02/02/2006", "age": 20},
            {"name": "Student C", "dob": "03/03/2006", "age": 20}
        ]
    }

    response = client.post(
        "/api/registrations",
        json=payload,
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )

    assert response.status_code == 201
    data = response.json()

    # 1 Registration
    assert data["registrationId"].startswith("KD-")
    assert len(data["participants"]) == 3
    assert data["under20Count"] == 3
    assert data["above20Count"] == 0
    # Standard pricing rule: 3 * 299 = 897
    assert data["totalAmount"] == 897


def test_unauthenticated_registration_rejected():
    """Registration without token must return 401."""
    payload = {
        "participants": [
            {"name": "Test Guest", "dob": "01/01/2000"}
        ]
    }
    response = client.post("/api/registrations", json=payload)
    assert response.status_code == 401


def test_user_cannot_access_other_users_registration():
    """User B cannot fetch User A's private registration dossier."""
    # Create booking for User A
    create_res = client.post(
        "/api/registrations",
        json={"participants": [{"name": "User A Attendee", "dob": "01/01/2000"}]},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    reg_id = create_res.json()["registrationId"]

    # User B attempts to access it
    res = client.get(
        f"/api/registrations/{reg_id}",
        headers={"Authorization": f"Bearer {USER_B_TOKEN}"}
    )
    assert res.status_code == 403


def test_admin_can_access_any_registration():
    """Admin (teamredhawkz@gmail.com) can access any registration."""
    create_res = client.post(
        "/api/registrations",
        json={"participants": [{"name": "User A Attendee", "dob": "01/01/2000"}]},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    reg_id = create_res.json()["registrationId"]

    # Admin access
    res = client.get(
        f"/api/registrations/{reg_id}",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
    )
    assert res.status_code == 200
    assert res.json()["registrationId"] == reg_id


def test_admin_routes_forbidden_for_normal_users():
    """Non-admin user receives 403 on admin endpoints."""
    # User A tries to get admin stats
    res_stats = client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    assert res_stats.status_code == 403

    # User A tries to list all admin registrations
    res_regs = client.get(
        "/api/admin/registrations",
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    assert res_regs.status_code == 403


def test_admin_routes_allowed_for_admin():
    """Admin receives 200 and stats on admin endpoints."""
    res_stats = client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
    )
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert "totalRegistrations" in stats
    assert "totalParticipants" in stats
    assert "totalRevenue" in stats


def test_my_registrations_isolation():
    """User only receives their own bookings via /api/my/registrations."""
    # User A registers
    client.post(
        "/api/registrations",
        json={"participants": [{"name": "User A Attendee", "dob": "01/01/2000"}]},
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    # User B registers
    client.post(
        "/api/registrations",
        json={"participants": [{"name": "User B Attendee", "dob": "01/01/2002"}]},
        headers={"Authorization": f"Bearer {USER_B_TOKEN}"}
    )

    # Check User A's bookings
    res_a = client.get(
        "/api/my/registrations",
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    assert res_a.status_code == 200
    regs_a = res_a.json()
    assert len(regs_a) == 1
    assert regs_a[0]["userEmail"] == "usera@example.com"

    # Check User B's bookings
    res_b = client.get(
        "/api/my/registrations",
        headers={"Authorization": f"Bearer {USER_B_TOKEN}"}
    )
    assert res_b.status_code == 200
    regs_b = res_b.json()
    assert len(regs_b) == 1
    assert regs_b[0]["userEmail"] == "userb@example.com"


def test_payment_verification_and_tampering_protection():
    """
    Verify payment settlement cannot be spoofed by sending paymentStatus='PAID'
    directly in creation payload.
    """
    # 1. Attempt to inject paymentStatus: 'PAID' or amount: 10 during creation
    create_payload = {
        "participants": [{"name": "Tamper Test", "dob": "10/10/2000"}],
        "paymentStatus": "PAID",
        "totalAmount": 10,
        "amount": 10
    }
    create_res = client.post(
        "/api/registrations",
        json=create_payload,
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    assert create_res.status_code == 201
    created = create_res.json()
    reg_id = created["registrationId"]

    # Registration MUST remain PENDING and total amount MUST be authoritative (299, not 10)
    assert created["paymentStatus"] == "PENDING"
    assert created["registrationStatus"] == "PENDING"
    assert created["totalAmount"] == 299

    # 2. Complete payment verification via payment API
    verify_payload = {
        "registrationId": reg_id,
        "transactionRef": "UPI491827491",
        "paymentMethod": "UPI (Google Pay)",
        "simulateSuccess": True
    }
    verify_res = client.post(
        "/api/payments/verify",
        json=verify_payload,
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["paymentStatus"] == "PAID"

    # 3. Check updated registration record
    fetch_res = client.get(
        f"/api/registrations/{reg_id}",
        headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
    )
    updated = fetch_res.json()
    assert updated["paymentStatus"] == "PAID"
    assert updated["registrationStatus"] == "CONFIRMED"
    assert updated["transactionId"] == "UPI491827491"
