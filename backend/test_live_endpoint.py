import io, time, requests, json
from PIL import Image, ImageDraw
from app.firebase import init_firebase, auth

def create_receipt_image(amount_str, payee="Arpith Manohar", upi_ref="123456789012"):
    img = Image.new("RGB", (500, 300), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((30, 30), "Google Pay - Payment Successful", fill=(20, 20, 20))
    draw.text((30, 80), f"Paid to: {payee}", fill=(50, 50, 50))
    draw.text((30, 130), f"Rs. {amount_str}", fill=(0, 120, 60))
    draw.text((30, 180), f"UPI Transaction ID: {upi_ref}", fill=(80, 80, 80))
    draw.text((30, 220), "Completed on 10 Oct 2026", fill=(100, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()

def run_live_test():
    print("=== LIVE PRODUCTION ENDPOINT TEST ===")
    init_firebase()
    user_uid = f"live_test_{int(time.time())}"
    user_email = f"{user_uid}@example.com"
    custom_token = auth.create_custom_token(user_uid, {"email": user_email})
    if isinstance(custom_token, bytes):
        custom_token = custom_token.decode("utf-8")
        
    api_key = "AIzaSyDAJhJrkjDbC5wYnqfZes3tPe5EJAc5zns"
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={api_key}"
    resp = requests.post(url, json={"token": custom_token, "returnSecureToken": True})
    auth_data = resp.json()
    id_token = auth_data.get("idToken")
    assert id_token, f"Failed to get Firebase ID Token: {auth_data}"
    print(f"Obtained valid Firebase ID Token for {user_email}")

    base_url = "https://daniya.onrender.com"
    headers = {"Authorization": f"Bearer {id_token}"}
    
    # 1. Create a registration on live server
    print("Creating live registration on Render...")
    reg_payload = {
        "participants": [
            {"name": "Live Tester", "age": 24, "dob": "12/05/1998"}
        ]
    }
    t_reg_start = time.perf_counter()
    reg_resp = requests.post(f"{base_url}/api/registrations", json=reg_payload, headers=headers, timeout=30)
    t_reg = (time.perf_counter() - t_reg_start) * 1000
    print(f"Registration response ({t_reg:.1f}ms): Status {reg_resp.status_code}")
    assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
    reg_data = reg_resp.json()
    reg_id = reg_data["registrationId"]
    expected_amount = reg_data["expectedAmount"]
    print(f"Live Registration ID: {reg_id}, Expected Amount: INR {expected_amount}")
    
    # 2. Test verify-proof on live server
    print(f"Sending verify-proof request to {base_url}/api/payments/verify-proof ...")
    receipt_bytes = create_receipt_image(str(expected_amount), upi_ref=f"TXN{int(time.time())}")
    files = {
        "receipt": ("receipt.jpg", receipt_bytes, "image/jpeg")
    }
    form_data = {
        "registration_id": reg_id,
        "entered_amount": expected_amount
    }
    
    t_verify_start = time.perf_counter()
    verify_resp = requests.post(
        f"{base_url}/api/payments/verify-proof",
        data=form_data,
        files=files,
        headers=headers,
        timeout=30
    )
    t_verify = (time.perf_counter() - t_verify_start) * 1000
    print(f"Live verify-proof response ({t_verify:.1f}ms): Status {verify_resp.status_code}")
    print(f"Response Body: {verify_resp.text}")
    
    assert verify_resp.status_code == 200, f"Expected 200 OK from live endpoint, got {verify_resp.status_code}: {verify_resp.text}"
    verify_data = verify_resp.json()
    assert verify_data.get("success") is True, f"Verification success is not True: {verify_data}"
    assert verify_data.get("paymentStatus") == "PAID", f"Payment status is not PAID: {verify_data}"
    assert verify_data.get("verificationStatus") == "VERIFIED", f"Verification status is not VERIFIED: {verify_data}"
    assert len(verify_data.get("ticketIds", [])) == 1, f"Tickets not issued: {verify_data}"
    
    print("\nSUCCESS: Live production endpoint POST /api/payments/verify-proof passed with 200 OK!")
    print(f"Ticket generated: {verify_data.get('ticketIds')}")
    print(f"Verification latency: {t_verify:.1f}ms")

    # 3. Test idempotent retry
    print("\nTesting idempotent retry on live server...")
    t_retry_start = time.perf_counter()
    retry_resp = requests.post(
        f"{base_url}/api/payments/verify-proof",
        data=form_data,
        files={"receipt": ("receipt.jpg", receipt_bytes, "image/jpeg")},
        headers=headers,
        timeout=30
    )
    t_retry = (time.perf_counter() - t_retry_start) * 1000
    assert retry_resp.status_code == 200
    retry_data = retry_resp.json()
    assert retry_data.get("ticketIds") == verify_data.get("ticketIds"), "Tickets did not match on retry"
    print(f"PASS: Idempotent retry completed in {t_retry:.1f}ms with identical ticket {retry_data.get('ticketIds')}")

    # 4. Test INR 200 rejection when INR 299 expected
    print("\nTesting INR 200 receipt rejection on live server...")
    reg2_resp = requests.post(f"{base_url}/api/registrations", json=reg_payload, headers=headers, timeout=30)
    assert reg2_resp.status_code == 201
    reg2_id = reg2_resp.json()["registrationId"]
    bad_receipt_bytes = create_receipt_image("200", upi_ref=f"TXN{int(time.time())}")
    t_rej_start = time.perf_counter()
    rej_resp = requests.post(
        f"{base_url}/api/payments/verify-proof",
        data={"registration_id": reg2_id, "entered_amount": 299},
        files={"receipt": ("receipt.jpg", bad_receipt_bytes, "image/jpeg")},
        headers=headers,
        timeout=30
    )
    t_rej = (time.perf_counter() - t_rej_start) * 1000
    assert rej_resp.status_code == 200
    rej_data = rej_resp.json()
    assert rej_data.get("success") is False
    assert rej_data.get("paymentStatus") == "PENDING"
    assert len(rej_data.get("ticketIds", [])) == 0
    print(f"PASS: INR 200 receipt rejected safely in {t_rej:.1f}ms (no tickets issued)")

if __name__ == "__main__":
    run_live_test()
