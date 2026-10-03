from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from ..models.registration import RegistrationCreateRequest, RegistrationRecord
from ..services.registration_service import RegistrationService
from ..utils.security import get_current_user, get_current_admin

router = APIRouter(prefix="/api/registrations", tags=["Registrations"])


@router.post("", response_model=RegistrationRecord, status_code=status.HTTP_201_CREATED)
async def create_registration(
    request: RegistrationCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new Master Event Registration.
    - Authenticated attendee required.
    - One master registration is created for all provided participants.
    - Individual ticket passes are generated in PENDING payment status.
    """
    try:
        record = RegistrationService.create_registration(
            request=request,
            user=current_user,
            apply_concession_discount=False
        )
        return record
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration creation failed: {str(e)}"
        )


@router.get("/{registration_id}", response_model=RegistrationRecord)
async def get_registration(
    registration_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve registration by ID. User must be the owner or an admin."""
    record = RegistrationService.get_registration(registration_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration {registration_id} not found."
        )

    # Authorization check
    user_uid = current_user.get("uid")
    user_email = (current_user.get("email") or "").lower()
    is_owner = (record.get("userId") == user_uid) or (record.get("userEmail", "").lower() == user_email)
    from ..config import settings
    is_admin = (user_email == settings.ADMIN_EMAIL.strip().lower()) or (current_user.get("admin") is True)

    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this registration dossier."
        )

    return record
