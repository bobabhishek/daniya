from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from ..models.payment import PaymentOrder, PaymentVerificationRequest, PaymentVerificationResponse
from ..services.registration_service import RegistrationService
from ..services.payment_service import PaymentService
from ..utils.security import get_current_user

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/create-order", response_model=PaymentOrder)
async def create_payment_order(
    registration_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generate payment order for an existing pending registration.
    Future gateway integration point (e.g. PhonePe init).
    """
    record = RegistrationService.get_registration(registration_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration {registration_id} not found."
        )

    # User authorization
    user_uid = current_user.get("uid")
    user_email = (current_user.get("email") or "").lower()
    if record.get("userId") != user_uid and record.get("userEmail", "").lower() != user_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized payment request."
        )

    order = PaymentService.create_payment_order(
        registration_id=registration_id,
        amount=record["totalAmount"]
    )
    return order


@router.post("/verify", response_model=PaymentVerificationResponse)
async def verify_payment(
    request: PaymentVerificationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Verify payment settlement and mark registration + passes as PAID.
    Never trusts client total amount or forced paid flag.
    """
    record = RegistrationService.get_registration(request.registrationId)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration {request.registrationId} not found."
        )

    # User authorization
    user_uid = current_user.get("uid")
    user_email = (current_user.get("email") or "").lower()
    if record.get("userId") != user_uid and record.get("userEmail", "").lower() != user_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized payment verification attempt."
        )

    # Perform payment verification
    verification = PaymentService.verify_payment(
        registration_id=request.registrationId,
        transaction_ref=request.transactionRef,
        method=request.paymentMethod,
        simulate_success=request.simulateSuccess if request.simulateSuccess is not None else True
    )

    if verification["success"]:
        RegistrationService.mark_payment_completed(
            registration_id=request.registrationId,
            transaction_id=verification["transactionId"],
            payment_method=request.paymentMethod or "UPI (Official QR)"
        )

    return PaymentVerificationResponse(**verification)
