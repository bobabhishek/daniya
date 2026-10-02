from typing import Optional
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


class PaymentVerificationRequest(BaseModel):
    """Client request confirming payment submission."""
    registrationId: str = Field(..., description="ID of the registration being paid")
    transactionRef: Optional[str] = Field(None, description="UPI reference or UTR transaction number")
    paymentMethod: Optional[str] = Field("UPI (Official QR)", description="Method of payment")
    simulateSuccess: Optional[bool] = Field(True, description="Flag for local/demo verification")


class PaymentVerificationResponse(BaseModel):
    success: bool
    registrationId: str
    paymentStatus: str
    registrationStatus: str
    transactionId: str
    message: str
