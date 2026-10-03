from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from .participant import ParticipantInput, ParticipantRecord


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"


class RegistrationStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"


class VerificationStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    FAILED = "FAILED"


class RegistrationCreateRequest(BaseModel):
    """Request payload sent by frontend to initiate a booking."""
    participants: List[ParticipantInput] = Field(..., min_length=1, max_length=20, description="List of attendees")
    paymentMethod: Optional[str] = "UPI (Official QR)"


class RegistrationRecord(BaseModel):
    """Master registration record representing ONE booking for 1 or more attendees."""
    registrationId: str = Field(..., description="Unique ID format KD-XXXXXX")
    userId: Optional[str] = None
    userEmail: Optional[str] = None
    userName: Optional[str] = None
    createdAt: str
    dateTime: str  # e.g. "03/10/2026, 02:45 AM" formatted for frontend admin & receipt UI
    participants: List[ParticipantRecord]
    participantCount: int
    count: int  # Exact alias expected by AdminDashboard & MyTicketsModal
    under20Count: int
    above20Count: int
    expectedAmount: int = Field(..., description="Authoritative backend-calculated expected amount")
    totalAmount: int
    amount: int  # Exact alias expected by AdminDashboard & MyTicketsModal
    finalApprovedAmount: Optional[int] = None  # Concession if approved
    enteredAmount: Optional[int] = None  # Amount manually entered by user during proof upload
    ocrAmount: Optional[int] = None  # Amount extracted by OCR from receipt screenshot
    ocrConfidence: Optional[float] = None
    paymentStatus: PaymentStatus = PaymentStatus.PENDING
    verificationStatus: VerificationStatus = VerificationStatus.PENDING
    registrationStatus: RegistrationStatus = RegistrationStatus.PENDING
    paymentMethod: Optional[str] = "UPI (Official QR)"
    transactionId: Optional[str] = None
    receiptPath: Optional[str] = None
    originalFilename: Optional[str] = None
    participantsSummary: str
    ticketIds: List[str] = Field(default_factory=list, description="Tickets assigned only after successful verification")
    uploadedAt: Optional[str] = None
    updatedAt: Optional[str] = None
