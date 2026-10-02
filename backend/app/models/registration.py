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
    totalAmount: int
    amount: int  # Exact alias expected by AdminDashboard & MyTicketsModal
    paymentStatus: PaymentStatus = PaymentStatus.PENDING
    registrationStatus: RegistrationStatus = RegistrationStatus.PENDING
    paymentMethod: Optional[str] = "UPI (Official QR)"
    transactionId: Optional[str] = None
    participantsSummary: str
    ticketIds: List[str]
