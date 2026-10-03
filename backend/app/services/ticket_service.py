from typing import List, Dict, Any, Optional
from datetime import datetime
from ..config import settings
from ..models.ticket import TicketRecord
from ..services.id_service import IdService
from ..firebase import get_db


class TicketService:
    """Service to issue, persist, and query individual festival tickets."""

    @staticmethod
    def build_ticket(
        registration_id: str,
        ticket_id: str,
        participant: Dict[str, Any],
        payment_status: str = "PAID"
    ) -> TicketRecord:
        now_str = datetime.now().isoformat()
        return TicketRecord(
            ticketId=ticket_id,
            registrationId=registration_id,
            participantId=participant.get("participantId") or participant.get("id", "p1"),
            name=participant["name"],
            participantName=participant["name"],
            age=participant["age"],
            dob=participant["dob"],
            category=participant.get("category", "ADULT"),
            price=participant.get("price", 299),
            eventName=settings.EVENT_NAME,
            eventDate=settings.EVENT_DATE,
            eventTime=settings.EVENT_TIME,
            venue=settings.EVENT_VENUE,
            eventLocation=settings.EVENT_VENUE,
            paymentStatus=payment_status,
            createdAt=now_str
        )

    @staticmethod
    def issue_tickets_for_registration(registration_data: Dict[str, Any]) -> List[str]:
        """
        CRITICAL RULE:
        Tickets MUST NOT be generated before successful payment verification.
        This method is invoked ONLY after the three-way amount comparison succeeds.
        """
        reg_id = registration_data["registrationId"]
        participants = registration_data.get("participants", [])
        tickets_to_save: List[TicketRecord] = []
        ticket_ids: List[str] = []

        for idx, p in enumerate(participants):
            ticket_id = IdService.generate_ticket_id(reg_id, idx)
            ticket_ids.append(ticket_id)
            p["ticketId"] = ticket_id

            t_record = TicketService.build_ticket(
                registration_id=reg_id,
                ticket_id=ticket_id,
                participant=p,
                payment_status="PAID"
            )
            tickets_to_save.append(t_record)

        TicketService.save_tickets(tickets_to_save)
        return ticket_ids

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
