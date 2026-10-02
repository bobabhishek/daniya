from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from ..models.registration import RegistrationRecord
from ..models.ticket import TicketRecord
from ..services.registration_service import RegistrationService
from ..services.ticket_service import TicketService
from ..utils.security import get_current_user

router = APIRouter(prefix="/api/my", tags=["User Bookings"])


@router.get("/registrations", response_model=List[RegistrationRecord])
async def get_my_registrations(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve all event bookings belonging to the currently authenticated user."""
    uid = current_user.get("uid")
    email = current_user.get("email")
    records = RegistrationService.list_user_registrations(user_id=uid, user_email=email)
    return records


@router.get("/tickets", response_model=List[TicketRecord])
async def get_my_tickets(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve all tickets belonging to bookings created by the authenticated user."""
    uid = current_user.get("uid")
    email = current_user.get("email")
    regs = RegistrationService.list_user_registrations(user_id=uid, user_email=email)

    all_tickets = []
    for r in regs:
        reg_id = r.get("registrationId")
        tickets = TicketService.list_tickets_for_registration(reg_id)
        all_tickets.extend(tickets)

    return all_tickets


@router.get("/registrations/{registration_id}", response_model=RegistrationRecord)
async def get_my_single_registration(
    registration_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve details for a specific user booking."""
    record = RegistrationService.get_registration(registration_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found."
        )

    uid = current_user.get("uid")
    email = (current_user.get("email") or "").lower()
    if record.get("userId") != uid and record.get("userEmail", "").lower() != email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this booking."
        )

    return record
