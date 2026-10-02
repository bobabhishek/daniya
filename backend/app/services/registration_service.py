from typing import List, Dict, Any, Optional
from datetime import datetime
from ..config import settings
from ..models.registration import (
    RegistrationCreateRequest,
    RegistrationRecord,
    PaymentStatus,
    RegistrationStatus
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
    """Core Service managing Master Registrations."""

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

        # 2. Generate Master Registration ID
        reg_id = IdService.generate_registration_id()

        # 3. Create Participant Records and Ticket Records
        participant_records: List[ParticipantRecord] = []
        ticket_ids: List[str] = []
        tickets_to_save = []

        now = datetime.now()
        iso_now = now.isoformat()
        indian_now = format_indian_datetime(now)

        for idx, p_info in enumerate(breakdown["participant_details"]):
            ticket_id = IdService.generate_ticket_id(reg_id, idx)
            ticket_ids.append(ticket_id)

            precord = ParticipantRecord(
                id=p_info["id"],
                participantId=p_info["participantId"],
                name=p_info["name"],
                age=p_info["age"],
                dob=p_info["dob"],
                category=p_info["category"],
                price=p_info["price"],
                ticketId=ticket_id,
                idProofType=p_info.get("idProofType", "Aadhaar Card (with DOB)")
            )
            participant_records.append(precord)

            # Ticket pass
            t_record = TicketService.build_ticket(
                registration_id=reg_id,
                ticket_id=ticket_id,
                participant=p_info,
                payment_status=PaymentStatus.PENDING.value
            )
            tickets_to_save.append(t_record)

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
            totalAmount=breakdown["total_amount"],
            amount=breakdown["total_amount"],
            paymentStatus=PaymentStatus.PENDING,
            registrationStatus=RegistrationStatus.PENDING,
            paymentMethod=request.paymentMethod or "UPI (Official QR)",
            transactionId=None,
            participantsSummary=names_summary,
            ticketIds=ticket_ids
        )

        # 5. Persist to Firestore
        db = get_db()
        db.collection("registrations").document(reg_id).set(master_record.model_dump())
        TicketService.save_tickets(tickets_to_save)

        return master_record

    @staticmethod
    def get_registration(registration_id: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        doc = db.collection("registrations").document(registration_id).get()
        return doc.to_dict() if doc.exists else None

    @staticmethod
    def mark_payment_completed(
        registration_id: str,
        transaction_id: str,
        payment_method: str = "UPI (Official QR)"
    ) -> Optional[Dict[str, Any]]:
        db = get_db()
        doc_ref = db.collection("registrations").document(registration_id)
        doc_snap = doc_ref.get()
        if not doc_snap.exists:
            return None

        data = doc_snap.to_dict()
        data["paymentStatus"] = PaymentStatus.PAID.value
        data["registrationStatus"] = RegistrationStatus.CONFIRMED.value
        data["transactionId"] = transaction_id
        data["paymentMethod"] = payment_method

        doc_ref.update({
            "paymentStatus": PaymentStatus.PAID.value,
            "registrationStatus": RegistrationStatus.CONFIRMED.value,
            "transactionId": transaction_id,
            "paymentMethod": payment_method
        })

        # Also update linked tickets
        ticket_ids = data.get("ticketIds", [])
        TicketService.update_tickets_payment_status(ticket_ids, PaymentStatus.PAID.value)

        # Update embedded participants list paymentStatus if applicable
        return data

    @staticmethod
    def list_user_registrations(user_id: str, user_email: Optional[str] = None) -> List[Dict[str, Any]]:
        db = get_db()
        results: Dict[str, Dict[str, Any]] = {}

        # Query by userId
        q1 = db.collection("registrations").where("userId", "==", user_id)
        for doc in q1.stream():
            data = doc.to_dict()
            results[data["registrationId"]] = data

        # Query by userEmail if present
        if user_email:
            q2 = db.collection("registrations").where("userEmail", "==", user_email.lower())
            for doc in q2.stream():
                data = doc.to_dict()
                results[data["registrationId"]] = data

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
                paidCount = paid_count + 1
                paid_count = paidCount
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
