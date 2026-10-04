# Taal Pe Nacho Re — Garba & Dandiya Night 2026 🪘✨

A full-stack, enterprise-grade event registration, QR pass ticketing, and organizer audit management platform built for **Taal Pe Nacho Re — Garba & Dandiya Night 2026** (organized by *Red Hawks School of Dance*).

---

## 🌟 Key Highlights & Capabilities

- 🎫 **Multi-Participant Registration Wizard**: Register single or grouped attendees with participant details, ID proof references, and dynamic age-tier categorization.
- 💳 **Payment Flow & Verification**: Robust order generation and verification architecture with instant UI feedback and receipt logging.
- 📱 **Digital QR Passes (Zero-Latency Issuance)**: Instant client-side pass issuance with unique ticket IDs (`KD-XXXXXX-T01`, `T02`...), scannable QR verification codes, and high-resolution PNG download support powered by `html2canvas`.
- 🔐 **Role-Based Security & Fast Auth**: Firebase Auth integration with persistent local session caching, Google public certificate verification, in-memory token caching, and backend thread offloading for maximum throughput.
- 📊 **Organizer Admin Portal**: Real-time registration dashboard, attendee search and filter, payment/verification audit status, and instant **Excel master roster exports** (`.xlsx`).
- 🧪 **Complete CI Test Suite**: End-to-end acceptance tests, unit tests, and production build checks runnable with a single command.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, Tailwind CSS, Framer Motion, Lucide Icons, html2canvas, Canvas Confetti |
| **Backend** | FastAPI, Python 3.10+, Pydantic v2, Uvicorn, AnyIO |
| **Database & Auth** | Google Cloud Firestore (with in-memory fallback for local dev), Firebase Auth |
| **Export Engine** | OpenPyXL (formatted Excel roster exports) |
| **Testing** | Pytest, Node Test Runner (`node:test`) |

---

## 📁 Repository Structure

```text
daniya/
├── README.md                      # Global project documentation (this file)
├── run_ci.py                      # One-click CI runner (Frontend tests + Build + Pytest)
│
├── backend/                       # FastAPI Service
│   ├── app/
│   │   ├── config.py              # Environment configuration & business rules
│   │   ├── firebase.py            # Token verification, caching & Firestore client
│   │   ├── main.py                # FastAPI initialization & middleware
│   │   ├── models/                # Pydantic schemas (registrations, tickets, payments)
│   │   ├── routes/                # API route handlers (admin, auth, payments, registrations, tickets)
│   │   ├── services/              # Business logic (payment, registration, Excel export)
│   │   └── utils/                 # Security dependencies & helper functions
│   ├── tests/                     # 29+ automated Pytest test suites
│   ├── requirements.txt           # Python package requirements
│   ├── pytest.ini                 # Pytest configuration
│   └── README.md                  # Dedicated backend architecture guide
│
└── daniya/                        # React Frontend Application
    ├── src/
    │   ├── components/            # UI components (Navbar, Hero, Wizard, Tickets, Admin)
    │   ├── context/               # AuthContext, PassesContext, ToastContext
    │   ├── config/                # Event metadata & pricing configuration
    │   ├── services/              # API client & backend service integration
    │   ├── utils/                 # Ticket pass mergers, role helpers, formatting
    │   ├── App.jsx                # Main application coordinator
    │   └── main.jsx               # React DOM entrypoint
    ├── tests/                     # Frontend unit and contract tests
    ├── package.json               # NPM scripts & dependencies
    ├── vite.config.js             # Vite configuration
    └── tailwind.config.js         # Tailwind CSS styling tokens
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have installed:
- **Node.js**: v18.0.0 or later ([Download Node.js](https://nodejs.org/))
- **Python**: v3.10 or later ([Download Python](https://www.python.org/))
- **Git**

---

### 2. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - **Windows**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   *(Defaults are pre-configured for instant local development without cloud dependencies).*

5. **Start the FastAPI backend**:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

- **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### 3. Frontend Setup

1. **Open a new terminal and navigate to the frontend directory**:
   ```bash
   cd daniya
   ```

2. **Install node dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Start the Vite development server**:
   ```bash
   npm run dev
   ```

- **Frontend Application URL**: [http://localhost:5173](http://localhost:5173)

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Listening port | `8000` |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins | `http://localhost:5173,http://127.0.0.1:5173` |
| `ADMIN_EMAIL` | Super-admin email for portal access | `teamredhawkz@gmail.com` |
| `FIREBASE_PROJECT_ID` | Google Firebase Project ID | `dhandiya-hawkz` |
| `FIREBASE_CREDENTIALS_PATH` | Path to serviceAccountKey.json | `""` *(uses memory fallback if empty)* |
| `ADULT_PRICE` | Base price per attendee (INR) | `299` |
| `STUDENT_PRICE` | Student price (INR) | `299` |
| `MOCK_PAYMENT_ENABLED` | Enables simulated payment settlements | `true` |

### Frontend (`daniya/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of the FastAPI backend | `http://localhost:8000` |
| `VITE_PUBLIC_APP_URL` | Public application address | `http://localhost:5173` |
| `VITE_PUBLIC_TICKET_BASE_URL` | Base domain for ticket validation QR links | `http://localhost:5173` |

---

## 🧪 Running Automated Tests & CI

You can run the entire test suite (frontend tests, production bundle build, and all backend tests) in one step:

```bash
python run_ci.py
```

### Running Individual Test Suites:

- **Frontend Tests**:
  ```bash
  cd daniya
  npm test
  ```

- **Frontend Production Build**:
  ```bash
  cd daniya
  npm run build
  ```

- **Backend Pytest Suite**:
  ```bash
  cd backend
  pytest tests -v
  ```

---

## 🛡️ Role-Based Access Control

- **Attendee (`ROLES.ATTENDEE`)**:
  - Sign in via Google / Email.
  - Book single or multi-person event registrations.
  - Access personal passes under **My Passes** (`/api/my/registrations`, `/api/my/tickets`).
  - Download scannable PNG event passes.

- **Admin (`ROLES.ADMIN`)**:
  - Authenticated via organizer email (`teamredhawkz@gmail.com`).
  - Access the Organizer Admin Portal (`/api/admin/*`).
  - Real-time attendee audit roster with filtering, search, and manual verification toggles.
  - One-click **Download Master Excel Roster** for offline gate verification.

---

## 👥 Contributors & Acknowledgements
- Developed for **Red Hawks School of Dance**.
- Powered by FastAPI, React, and Firebase.
