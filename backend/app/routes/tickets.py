from fastapi import APIRouter, HTTPException, status
from ..models.ticket import TicketRecord
from ..services.ticket_service import TicketService

from ..config import settings

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])


@router.get("/{ticket_id}", response_model=TicketRecord)
async def get_ticket_public(ticket_id: str):
    """
    Public lookup for entry gate scanner or attendee verification.
    Returns admission ticket details without sensitive audit documents.
    """
    ticket = TicketService.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket {ticket_id} is invalid or does not exist."
        )
    return ticket


@router.get("/verify/{ticket_id}")
async def verify_ticket_public(ticket_id: str):
    """
    Public gate ticket verification endpoint.
    Used by QR scanners to immediately validate whether a pass is confirmed.
    """
    ticket = TicketService.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket {ticket_id} not found"
        )
    
    is_valid = ticket.get("paymentStatus") == "PAID" and ticket.get("status") in ("CONFIRMED", "ACTIVE", "ISSUED", None)
    return {
        "valid": is_valid,
        "ticketId": ticket.get("ticketId"),
        "registrationId": ticket.get("registrationId"),
        "participantName": ticket.get("name") or ticket.get("participantName"),
        "paymentStatus": ticket.get("paymentStatus"),
        "status": ticket.get("status") or "CONFIRMED",
        "category": ticket.get("category"),
        "eventName": settings.EVENT_NAME,
        "eventEdition": settings.EVENT_EDITION,
        "eventDate": settings.EVENT_DATE,
        "eventTime": settings.EVENT_TIME,
        "eventLocation": settings.EVENT_VENUE,
        "venue": settings.EVENT_VENUE
    }


