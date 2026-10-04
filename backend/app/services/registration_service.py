import time
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..config import settings
from ..models.registration import (
    RegistrationCreateRequest,
    RegistrationRecord,
    PaymentStatus,
    RegistrationStatus,
    VerificationStatus
)
from ..models.participant import ParticipantRecord
from ..services.pricing_service import PricingService
from ..services.id_service import IdService
from ..services.ticket_service import TicketService
from ..firebase import get_db


def format_indian_datetime(dt: datetime) -> str:
    """Format datetime as 'DD/MM/YYYY, HH:MM AM/PM' matching frontend."""
    return dt.strftime("%d/%m/%Y, %I:%M %p")


class RegistrationService:
    """Core Service managing Master Registrations & Verified Passes."""

    @staticmethod
    def create_registration(
        request: RegistrationCreateRequest,
        user: Dict[str, Any],
        apply_concession_discount: bool = False
    ) -> RegistrationRecord:
        # 1. Authoritative Pricing & Age Breakdown
        breakdown = PricingService.calculate_breakdown(
            request.participants,
            apply_student_discount=apply_concession_discount
        )

        expected_amount = breakdown["total_amount"]

        # 2. Generate Master Registration ID
        reg_id = IdService.generate_registration_id()

        now = datetime.now()
        iso_now = now.isoformat()
        indian_now = format_indian_datetime(now)

        # 3. Create Participant Records (tickets are NOT generated until payment verification succeeds)
        participant_records: List[ParticipantRecord] = []
        for idx, p_info in enumerate(breakdown["participant_details"]):
            precord = ParticipantRecord(
                id=p_info["id"],
                participantId=p_info["participantId"],
                name=p_info["name"],
                age=p_info["age"],
                dob=p_info["dob"],
                category=p_info["category"],
                price=p_info["price"],
                ticketId=None,  # Assigned ONLY after payment verification succeeds!
                idProofType=p_info.get("idProofType", "Aadhaar Card (with DOB)")
            )
            participant_records.append(precord)

        # 4. Master Registration Row
        names_summary = ", ".join([p.name for p in participant_records])

        master_record = RegistrationRecord(
            registrationId=reg_id,
            userId=user.get("uid"),
            userEmail=user.get("email"),
            userName=user.get("name") or user.get("displayName") or user.get("email"),
            createdAt=iso_now,
            dateTime=indian_now,
            participants=participant_records,
            participantCount=len(participant_records),
            count=len(participant_records),
            under20Count=breakdown["under_20_count"],
            above20Count=breakdown["above_20_count"],
            expectedAmount=expected_amount,
            totalAmount=expected_amount,
            amount=expected_amount,
            paymentStatus=PaymentStatus.PENDING,
            verificationStatus=VerificationStatus.PENDING,
            registrationStatus=RegistrationStatus.PENDING,
            paymentMethod=request.paymentMethod or "UPI (Official QR)",
            transactionId=None,
            participantsSummary=names_summary,
            ticketIds=[]  # Strictly empty until payment verification succeeds!
        )

        # 5. Persist Master Record to Firestore (no tickets issued yet)
        t_db_start = time.perf_counter()
        db = get_db()
        db.collection("registrations").document(reg_id).set(master_record.model_dump())
        t_db_ms = (time.perf_counter() - t_db_start) * 1000
        print(f"[DIAGNOSTIC] Firestore/database set('registrations', '{reg_id}') took {t_db_ms:.2f} ms", flush=True)

        return master_record

    @staticmethod
    def get_registration(registration_id: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        doc = db.collection("registrations").document(registration_id).get()
        return doc.to_dict() if doc.exists else None

    @staticmethod
    def mark_payment_verified(
        registration_id: str,
        entered_amount: int,
        ocr_amount: int,
        ocr_confidence: Optional[float] = None,
        receipt_path: Optional[str] = None,
        transaction_id: Optional[str] = None,
        original_filename: Optional[str] = None,
        payment_method: str = "UPI (Official QR)"
    ) -> Optional[Dict[str, Any]]:
        """
        Invoked ONLY after three-way amount comparison succeeds:
        expectedAmount == enteredAmount == ocrAmount
        1. Issues official tickets and persists them to the 'tickets' collection.
        2. Updates Master Registration with VERIFIED status and local receipt file path.
        """
        db = get_db()
        doc_ref = db.collection("registrations").document(registration_id)
        doc_snap = doc_ref.get()
        if not doc_snap.exists:
            return None

        data = doc_snap.to_dict()
        now_iso = datetime.now().isoformat()
        txn_ref = transaction_id or IdService.generate_transaction_id()

        # Generate official individual tickets now!
        ticket_ids = TicketService.issue_tickets_for_registration(data)
        data["participants"] = data.get("participants", [])

        # Update Master Record
        data["paymentStatus"] = PaymentStatus.PAID.value
        data["verificationStatus"] = VerificationStatus.VERIFIED.value
        data["registrationStatus"] = RegistrationStatus.CONFIRMED.value
        data["enteredAmount"] = entered_amount
        data["ocrAmount"] = ocr_amount
        data["ocrConfidence"] = ocr_confidence
        data["receiptPath"] = receipt_path
        data["transactionId"] = txn_ref
        data["paymentMethod"] = payment_method
        data["originalFilename"] = original_filename
        data["ticketIds"] = ticket_ids
        data["uploadedAt"] = now_iso
        data["updatedAt"] = now_iso

        doc_ref.set(data)
        return data

    @staticmethod
    def list_user_registrations(user_id: str, user_email: Optional[str] = None) -> List[Dict[str, Any]]:
        db = get_db()
        results: Dict[str, Dict[str, Any]] = {}
        user_email_lower = (user_email or "").strip().lower()

        # Scan all registrations and match by userId OR userEmail (case-insensitive)
        # This is safe for memory DB and Firestore fallback. For large-scale Firestore
        # use separate indexed queries per field.
        for doc in db.collection("registrations").stream():
            data = doc.to_dict()
            if not data:
                continue
            reg_id = data.get("registrationId", "")
            stored_uid = data.get("userId") or ""
            stored_email = (data.get("userEmail") or "").strip().lower()
            stored_name = (data.get("userName") or "").strip().lower()

            uid_match = stored_uid and stored_uid == user_id
            email_match = user_email_lower and (
                stored_email == user_email_lower or
                (user_email_lower in stored_email and "@" in stored_email)
            )
            # Support linked test identities (e.g. kamath / bobabhishek18@gmail.com)
            alias_match = False
            if user_email_lower and ("bobabhishek" in user_email_lower or "kamath" in user_email_lower):
                if "bobabhishek" in stored_email or "kamath" in stored_email or "kamath" in stored_name:
                    alias_match = True

            if uid_match or email_match or alias_match:
                results[reg_id] = data

        # Sort descending by createdAt
        sorted_list = sorted(
            list(results.values()),
            key=lambda x: x.get("createdAt", ""),
            reverse=True
        )
        return sorted_list

    @staticmethod
    def list_all_registrations() -> List[Dict[str, Any]]:
        db = get_db()
        all_docs = db.collection("registrations").stream()
        results = [doc.to_dict() for doc in all_docs if doc.exists]
        results.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
        return results

    @staticmethod
    def calculate_admin_stats() -> Dict[str, Any]:
        records = RegistrationService.list_all_registrations()
        total_regs = len(records)
        total_participants = 0
        under_20 = 0
        above_20 = 0
        revenue = 0
        paid_count = 0
        pending_count = 0

        for r in records:
            p_count = r.get("count", 0) or r.get("participantCount", 0)
            total_participants += p_count
            under_20 += r.get("under20Count", 0)
            above_20 += r.get("above20Count", 0)
            if r.get("paymentStatus") == PaymentStatus.PAID.value:
                revenue += r.get("amount", 0) or r.get("totalAmount", 0)
                paid_count += 1
            else:
                pending_count += 1

        return {
            "totalRegistrations": total_regs,
            "totalParticipants": total_participants,
            "under20Count": under_20,
            "above20Count": above_20,
            "totalRevenue": revenue,
            "paidCount": paid_count,
            "pendingCount": pending_count
        }
