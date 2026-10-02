from fastapi import APIRouter, HTTPException, status
from ..models.ticket import TicketRecord
from ..services.ticket_service import TicketService

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
