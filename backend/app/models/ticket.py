from typing import Optional
from pydantic import BaseModel, Field


class TicketRecord(BaseModel):
    """Individual pass assigned to one attendee."""
    ticketId: str = Field(..., description="Unique ticket ID e.g. KD-000001-T01")
    registrationId: str = Field(..., description="Parent registration ID e.g. KD-000001")
    participantId: str
    name: str  # Matches frontend ticket.name
    participantName: str
    phone: Optional[str] = None
    age: int
    dob: str
    category: str = "ADULT"
    price: int = 299
    eventName: str = "Taal Pe Nacho Re"
    eventDate: str = "10th October 2026"
    eventTime: str = "5:00 PM Onwards"
    venue: str = "TBA"
    eventLocation: str = "TBA"
    paymentStatus: str = "PENDING"
    createdAt: str
