from typing import List, Dict, Any, Optional
from datetime import datetime
from ..config import settings
from ..models.ticket import TicketRecord
from ..firebase import get_db


class TicketService:
    """Service to issue, persist, and query individual festival tickets."""

    @staticmethod
    def build_ticket(
        registration_id: str,
        ticket_id: str,
        participant: Dict[str, Any],
        payment_status: str = "PENDING"
    ) -> TicketRecord:
        now_str = datetime.now().isoformat()
        return TicketRecord(
            ticketId=ticket_id,
            registrationId=registration_id,
            participantId=participant["participantId"],
            name=participant["name"],
            participantName=participant["name"],
            age=participant["age"],
            dob=participant["dob"],
            category=participant["category"],
            price=participant["price"],
            eventName=settings.EVENT_NAME,
            eventDate=settings.EVENT_DATE,
            eventTime=settings.EVENT_TIME,
            venue=settings.EVENT_VENUE,
            gate="GATE 3",
            paymentStatus=payment_status,
            createdAt=now_str
        )

    @staticmethod
    def save_tickets(tickets: List[TicketRecord]):
        db = get_db()
        tickets_col = db.collection("tickets")
        for t in tickets:
            tickets_col.document(t.ticketId).set(t.model_dump())

    @staticmethod
    def update_tickets_payment_status(ticket_ids: List[str], payment_status: str):
        db = get_db()
        tickets_col = db.collection("tickets")
        for tid in ticket_ids:
            doc_ref = tickets_col.document(tid)
            doc_snap = doc_ref.get()
            if doc_snap.exists:
                doc_ref.update({"paymentStatus": payment_status})

    @staticmethod
    def get_ticket(ticket_id: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        doc = db.collection("tickets").document(ticket_id).get()
        return doc.to_dict() if doc.exists else None

    @staticmethod
    def list_tickets_for_registration(registration_id: str) -> List[Dict[str, Any]]:
        db = get_db()
        query = db.collection("tickets").where("registrationId", "==", registration_id)
        results = []
        for doc in query.stream():
            results.append(doc.to_dict())
        return results
