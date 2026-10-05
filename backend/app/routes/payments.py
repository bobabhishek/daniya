from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from ..models.payment import PaymentOrder, PaymentVerificationResponse
from ..services.registration_service import RegistrationService
from ..services.payment_service import PaymentService
from ..utils.security import get_current_user
from ..config import settings

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/create-order", response_model=PaymentOrder)
async def create_payment_order(
    registration_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generate payment order for an existing pending registration.
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
        amount=record.get("expectedAmount", record.get("totalAmount", 299))
    )
    return order


@router.post("/verify-proof", response_model=PaymentVerificationResponse)
async def verify_payment_proof(
    registration_id: str = Form(..., description="Master registration ID"),
    entered_amount: int = Form(..., description="Amount entered manually by the attendee"),
    receipt: UploadFile = File(..., description="Uploaded payment receipt screenshot"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Authoritative Three-Way Payment Verification:
    1. EXPECTED AMOUNT: Calculated authoritatively by backend from participants.
    2. USER ENTERED AMOUNT: Submitted by attendee after receipt upload.
    3. OCR AMOUNT: Extracted via hosted OCR from the uploaded screenshot.

    CRITICAL RULES:
    - ALL THREE MUST MATCH.
    - If match: store receipt locally, store metadata in Firestore, mark payment VERIFIED, issue tickets.
    - If mismatch or OCR failure: REJECT, do NOT store permanently, do NOT issue tickets.
    """
    record = RegistrationService.get_registration(registration_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration {registration_id} not found."
        )

    # User authorization (owner or admin)
    user_uid = current_user.get("uid")
    user_email = (current_user.get("email") or "").lower()
    is_owner = (record.get("userId") == user_uid) or (record.get("userEmail", "").lower() == user_email)
    is_admin = (user_email == settings.ADMIN_EMAIL.strip().lower()) or (current_user.get("admin") is True)

    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: You can only submit verification for your own booking."
        )

    # Validate file type
    content_type = receipt.content_type or "image/jpeg"
    if not (content_type.startswith("image/") or receipt.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a PNG, JPG, or WebP screenshot."
        )

    # Read image bytes into memory for temporary processing
    image_bytes = await receipt.read()
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty. Please select a valid payment screenshot."
        )

    # Execute authoritative three-way verification with safe error handling in worker thread
    try:
        from anyio import to_thread
        result = await to_thread.run_sync(
            PaymentService.verify_payment_receipt,
            registration_id,
            entered_amount,
            image_bytes,
            receipt.filename or "payment_receipt.jpg",
            content_type
        )
        return PaymentVerificationResponse(**result)
    except Exception as e:
        import logging
        logging.getLogger("dandiya_backend.payments").error(
            f"Unhandled exception during payment verification for {registration_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment verification service temporarily failed. Please try again."
        )


@router.post("/verify", response_model=PaymentVerificationResponse)
async def verify_payment_legacy(
    request: dict,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Legacy verification endpoint maintained for testing environments.
    Notice: In production, client-forced simulation is strictly disabled.
    """
    reg_id = request.get("registrationId")
    record = RegistrationService.get_registration(reg_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration {reg_id} not found."
        )

    # User authorization
    user_uid = current_user.get("uid")
    user_email = (current_user.get("email") or "").lower()
    if record.get("userId") != user_uid and record.get("userEmail", "").lower() != user_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized payment verification attempt."
        )

    expected = record.get("expectedAmount", record.get("totalAmount", 299))
    txn_id = request.get("transactionRef") or "TXN-SIMULATED"

    # Only allow simulated bypass in non-production environments
    if settings.ENVIRONMENT.lower() == "production":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Simulated verification is disabled in production. Please upload receipt screenshot via /verify-proof."
        )

    # In dev mode, complete verification and issue tickets
    updated = RegistrationService.mark_payment_verified(
        registration_id=reg_id,
        entered_amount=expected,
        ocr_amount=expected,
        ocr_confidence=1.0,
        receipt_path=None,
        transaction_id=txn_id,
        original_filename="dev_simulated.jpg"
    )

    return PaymentVerificationResponse(
        success=True,
        registrationId=reg_id,
        expectedAmount=expected,
        enteredAmount=expected,
        ocrAmount=expected,
        ocrConfidence=1.0,
        paymentStatus="PAID",
        verificationStatus="VERIFIED",
        registrationStatus="CONFIRMED",
        transactionId=txn_id,
        receiptPath=None,
        ticketIds=updated.get("ticketIds", []),
        message="Dev payment verified successfully."
    )
