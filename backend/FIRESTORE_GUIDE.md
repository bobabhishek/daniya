# 📊 FIRESTORE DATABASE GUIDE

## Where Excel Data Comes From

Your **Master Excel sheet with 45 rows** is generated from the **Firestore database** stored in:

```
backend/data/local_firestore_db.json
```

---

## How to Access the Database

### **Option 1: Direct Python Query** (Recommended)
```python
from app.firebase import get_db

db = get_db()

# Get all registrations
registrations = db.collection('registrations').stream()
for doc in registrations:
    data = doc.to_dict()
    print(f"ID: {doc.id}, Participant: {data['participants'][0]['name']}")
```

### **Option 2: View Raw JSON File**
Open directly:
```
backend/data/local_firestore_db.json
```

### **Option 3: Query via Admin API**
If backend is running:
```bash
curl http://localhost:8000/admin/export/master-excel \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Database Collections

| Collection | Count | Purpose |
|-----------|-------|---------|
| **registrations** | 45 | Master registration records (KD-000001, KD-000002, etc.) |
| **tickets** | 62 | Generated ticket records with QR codes |
| **payments** | 0 | Payment transaction records |
| **participants** | 0 | Individual participant details |

---

## Excel Generation Pipeline

```
1. User clicks "DOWNLOAD MASTER EXCEL (.XLSX)"
   ↓
2. API Call: GET /admin/export/master-excel
   ↓
3. RegistrationService.list_all_registrations()
   ├─ Queries: db.collection('registrations').stream()
   ├─ Fetches: All 45 registration documents
   └─ Returns: List of RegistrationRecord objects
   ↓
4. ExcelExportService.generate_master_excel()
   ├─ Creates: Workbook with headers
   ├─ Adds: 45 rows (1 per registration)
   ├─ Embeds: Payment screenshot images
   ├─ Calculates: Dynamic amounts, verification status
   └─ Returns: .xlsx file bytes
   ↓
5. Browser downloads: "Dandiya_Master_Registrations_YYYY-MM-DD.xlsx"
```

---

## Data Structure Example (KD-000001)

```json
{
  "id": "KD-000001",
  "booked_by": "user@example.com",
  "participants": [
    {
      "name": "Kamath Abhishek",
      "age": 23,
      "dob": "18/02/2003",
      "idProofType": "Aadhaar Card (with DOB)",
      "category": "ADULT",
      "price": 299,
      "ticketId": "KD-000001-T01",
      "participantId": "p1"
    }
  ],
  "expected_amount": 299,
  "verified_amount": 299,
  "payment_status": "PAID",
  "verification_status": "VERIFIED",
  "upi_ref": "12345678901",
  "payment_screenshot_uploaded_time": "2026-10-04T20:44:40.001374"
}
```

---

## Python Utilities to Query Data

### **List All Registrations**
```python
from app.firebase import get_db
db = get_db()
regs = list(db.collection('registrations').stream())
print(f"Total: {len(regs)}")
```

### **Get Specific Registration**
```python
reg = db.collection('registrations').document('KD-000001').get()
print(reg.to_dict())
```

### **Filter by Payment Status**
```python
verified = []
for doc in db.collection('registrations').stream():
    data = doc.to_dict()
    if data.get('verification_status') == 'VERIFIED':
        verified.append(doc.id)
print(f"Verified: {len(verified)}")
```

### **Export to JSON**
```python
import json
data = {}
for doc in db.collection('registrations').stream():
    data[doc.id] = doc.to_dict()

with open('backup.json', 'w') as f:
    json.dump(data, f, indent=2, default=str)
```

---

## Clear Database (if needed)

```python
from app.firebase import memory_db
memory_db.clear()
```

---

## Current Database Stats

- **Registrations**: 45
- **Tickets**: 62  
- **Payments**: 0
- **Participants**: 0

---

## Files to Reference

- [firebase.py](../app/firebase.py) - Database initialization
- [registration_service.py](../app/services/registration_service.py) - Registration logic
- [excel_export_service.py](../app/services/excel_export_service.py) - Excel generation
- [admin.py](../app/routes/admin.py) - Admin API endpoints
