from typing import Optional
from pydantic import BaseModel, Field


class TicketRecord(BaseModel):
    """Individual pass assigned to one attendee."""
    ticketId: str = Field(..., description="Unique ticket ID e.g. KD-000001-T01")
    registrationId: str = Field(..., description="Parent registration ID e.g. KD-000001")
    participantId: str = "p1"
    name: str = "Attendee"  # Matches frontend ticket.name
    participantName: str = "Attendee"
    phone: Optional[str] = None
    phoneNumber: Optional[str] = None
    age: int = 18
    dob: str = ""
    category: str = "ADULT"
    price: int = 299
    eventName: str = "Taal Pe Nacho Re"
    eventDate: str = "10th October 2026"
    eventTime: str = "5:00 PM Onwards"
    venue: str = "TBA"
    eventLocation: str = "TBA"
    paymentStatus: str = "PENDING"
    createdAt: str = ""
