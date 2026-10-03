from typing import Optional, List
from pydantic import BaseModel, Field


class PaymentOrder(BaseModel):
    """Abstract payment order to be fulfilled by a payment gateway."""
    orderId: str
    registrationId: str
    amount: int
    currency: str = "INR"
    status: str = "PENDING"
    payeeName: str = "ARPITH MANOHAR"
    qrImageUrl: str = "/assets/admin_qr_arpith.jpg"
    createdAt: str


class PaymentProofVerificationRequest(BaseModel):
    """Payload for submitting payment receipt for OCR & three-way verification."""
    registrationId: str = Field(..., description="Master registration ID being verified")
    enteredAmount: int = Field(..., ge=1, description="Amount entered manually by user")


class PaymentVerificationResponse(BaseModel):
    """Authoritative response returned by backend after three-way amount comparison."""
    success: bool
    registrationId: str
    expectedAmount: int
    enteredAmount: int
    ocrAmount: Optional[int] = None
    ocrConfidence: Optional[float] = None
    paymentStatus: str  # "PAID" or "PENDING" / "FAILED"
    verificationStatus: str  # "VERIFIED" or "FAILED"
    registrationStatus: str  # "CONFIRMED" or "PENDING"
    transactionId: Optional[str] = None
    receiptPath: Optional[str] = None
    ticketIds: List[str] = []
    tickets: List[dict] = []  # Full ticket objects for immediate display after verification
    message: str
    mismatchReason: Optional[str] = None
    details: Optional[dict] = None
