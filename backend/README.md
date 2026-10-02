# Garba & Dandiya Night 2026 — Backend API

Official FastAPI backend powering event registration, pass issuance, pricing validation, and administrative oversight for Karkala's Dandiya & Garba Mahotsav 2026.

---

## 1. Architecture Overview

- **Framework**: FastAPI (Python 3.12) with Pydantic v2 schemas
- **Identity Layer**: Firebase Authentication (ID Token verification)
- **Database**: Google Cloud Firestore (with in-memory fallback for local dev & testing)
- **Server**: Uvicorn ASGI server
- **Design Principle**: **ONE REGISTRATION = ONE MASTER REGISTRATION**. Multiple attendees are bundled under one master booking row with individual ticket passes (`KD-XXXXXX-T01`, `KD-XXXXXX-T02`...).

---

## 2. Python Virtual Environment Setup

### Windows (PowerShell / Command Prompt)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Linux / macOS
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

---

## 3. Dependency Installation

Install all required packages from `requirements.txt`:

```bash
pip install -r requirements.txt
```

---

## 4. Required Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `APP_NAME` | Name of the service | `"Garba & Dandiya Night 2026 API"` |
| `ENVIRONMENT` | Environment name | `"development"` / `"production"` |
| `PORT` | Listening HTTP port | `8000` |
| `HOST` | Bind address | `"0.0.0.0"` |
| `ALLOWED_ORIGINS` | Permitted CORS origins | `"http://localhost:5173,http://127.0.0.1:5173"` |
| `ADMIN_EMAIL` | Organizer administrative email | `"teamredhawkz@gmail.com"` |
| `FIREBASE_PROJECT_ID` | Firebase Project ID | `"dhandiya-hawkz"` |
| `FIREBASE_CREDENTIALS_PATH` | Path to serviceAccountKey.json | `""` (uses memory fallback if empty) |
| `ADULT_PRICE` | Standard ticket price in INR | `299` |
| `STUDENT_PRICE` | Standard student ticket price in INR | `299` |
| `STUDENT_DISCOUNT_PRICE` | Authorized discount concession in INR | `199` |
| `STUDENT_AGE_MAX` | Max age qualifying for student category | `20` |
| `MOCK_PAYMENT_ENABLED` | Enable local payment verification | `true` |

---

## 5. Starting the FastAPI Server

### Development Mode with Hot Reload
```bash
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
```

Interactive API documentation will be available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/health`

---

## 6. Firebase Admin Setup

1. Open the [Firebase Console](https://console.firebase.google.com/) for project `dhandiya-hawkz`.
2. Navigate to **Project Settings** &rarr; **Service accounts**.
3. Click **Generate new private key** and download the JSON file.
4. Save the file in the `backend/` directory as `serviceAccountKey.json` (ensure it is listed in `.gitignore`).
5. In `.env`, set:
   ```env
   FIREBASE_CREDENTIALS_PATH="./serviceAccountKey.json"
   ```
*Note: If no service account file is specified, the backend automatically runs in memory-resilient development mode so developers can test and develop without GCP credentials.*

---

## 7. API Endpoints

### Public / Health
- `GET /` — API metadata and event info
- `GET /health` — Service health and active admin email
- `GET /api/tickets/{ticket_id}` — Public pass lookup for entry gate verification

### User Registrations & Tickets (Requires `Authorization: Bearer <Firebase_ID_Token>`)
- `POST /api/registrations` — Initiate master event booking
- `GET /api/registrations/{id}` — Retrieve booking dossier (owner or admin only)
- `POST /api/payments/create-order` — Create payment order for pending booking
- `POST /api/payments/verify` — Confirm payment settlement and mark registration as PAID
- `GET /api/my/registrations` — List all bookings belonging to authenticated user
- `GET /api/my/tickets` — List all tickets belonging to authenticated user

### Organizer Admin Portal (Requires Admin `teamredhawkz@gmail.com`)
- `GET /api/admin/stats` — Real-time aggregate dashboard stats
- `GET /api/admin/registrations` — List all master registrations with search & filter
- `GET /api/admin/registrations/{id}` — Full registration audit record
- `GET /api/admin/tickets` — List all issued passes for gate audit
- `GET /api/admin/tickets/{id}` — Single ticket pass inspection

---

## 8. Example Request & Response

### Request: `POST /api/registrations`
**Header**: `Authorization: Bearer <token>`
```json
{
  "participants": [
    {
      "name": "Aarav Sharma",
      "dob": "14/03/2008",
      "age": 18,
      "idProofType": "Aadhaar Card (with DOB)"
    },
    {
      "name": "Kabir Mehta",
      "dob": "05/11/1994",
      "age": 32,
      "idProofType": "Driving License"
    },
    {
      "name": "Diya Patel",
      "dob": "22/09/2006",
      "age": 20,
      "idProofType": "College ID (with DOB)"
    }
  ],
  "paymentMethod": "UPI (Official QR)"
}
```

### Response: `201 Created`
```json
{
  "registrationId": "KD-001245",
  "userId": "firebase_uid_123",
  "userEmail": "attendee@example.com",
  "userName": "Attendee Name",
  "createdAt": "2026-10-03T02:45:00",
  "dateTime": "03/10/2026, 02:45 AM",
  "participants": [
    {
      "id": "p1",
      "participantId": "p1",
      "name": "Aarav Sharma",
      "age": 18,
      "dob": "14/03/2008",
      "category": "STUDENT",
      "price": 299,
      "ticketId": "KD-001245-T01",
      "idProofType": "Aadhaar Card (with DOB)"
    },
    {
      "id": "p2",
      "participantId": "p2",
      "name": "Kabir Mehta",
      "age": 32,
      "dob": "05/11/1994",
      "category": "ADULT",
      "price": 299,
      "ticketId": "KD-001245-T02",
      "idProofType": "Driving License"
    },
    {
      "id": "p3",
      "participantId": "p3",
      "name": "Diya Patel",
      "age": 20,
      "dob": "22/09/2006",
      "category": "STUDENT",
      "price": 299,
      "ticketId": "KD-001245-T03",
      "idProofType": "College ID (with DOB)"
    }
  ],
  "participantCount": 3,
  "count": 3,
  "under20Count": 2,
  "above20Count": 1,
  "totalAmount": 897,
  "amount": 897,
  "paymentStatus": "PENDING",
  "registrationStatus": "PENDING",
  "paymentMethod": "UPI (Official QR)",
  "transactionId": null,
  "participantsSummary": "Aarav Sharma, Kabir Mehta, Diya Patel",
  "ticketIds": ["KD-001245-T01", "KD-001245-T02", "KD-001245-T03"]
}
```

---

## 9. How Frontend Connects to Backend

The frontend communicates with this backend using [`src/services/api.js`](file:///c:/Users/abhishek%20kamath/Downloads/daniya/daniya/src/services/api.js):
- Configured with `VITE_API_URL` (defaults to `http://localhost:8000`).
- Automatically extracts the Firebase user ID token via `auth.currentUser.getIdToken()` and sends it in the `Authorization: Bearer <token>` header.
- During registration payment in [`RegistrationWizard.jsx`](file:///c:/Users/abhishek%20kamath/Downloads/daniya/daniya/src/components/wizard/RegistrationWizard.jsx), it invokes:
  1. `api.createRegistration(participants, method)` &rarr; receives authoritative registration object.
  2. `api.verifyPayment(registrationId, utrNumber, method)` &rarr; records settlement.
  3. `api.getRegistration(registrationId)` &rarr; receives confirmed passes.

---

## 10. How Mock Payment Works

During development, `PaymentService.verify_payment()` validates that the registration exists and is owned by the calling user. If `simulateSuccess: true` (or when a UPI transaction reference is submitted), it marks the master registration and linked tickets as `PAID` / `CONFIRMED`.
Attempts to spoof `paymentStatus="PAID"` directly in the creation payload are explicitly ignored by the server.

---

## 11. Where PhonePe Integration Will Be Added Later

The payment system is cleanly decoupled via `app/services/payment_service.py`:
1. **Order Initiation (`create_payment_order`)**:
   - Construct PhonePe Standard Checkout request with `base64(payload)` and `X-VERIFY` SHA256 checksum.
   - Return PhonePe redirect URL / SDK intent.
2. **Server-to-Server Callback / Webhook (`verify_payment`)**:
   - Add a `/api/payments/phonepe-webhook` route that decodes PhonePe base64 payload and validates `X-VERIFY`.
   - On payment success, calls `RegistrationService.mark_payment_completed(reg_id, transaction_id, "PhonePe UPI")`.
   - No modifications to the registration database schema or ticket generation logic will be necessary.

---

## 12. Running Test Suite

Run the full automated test suite verifying all pricing, authorization, and multi-participant rules:

```bash
python -m pytest -v
```
