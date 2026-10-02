from typing import Optional
from pydantic import BaseModel, Field


class TicketRecord(BaseModel):
    """Individual pass assigned to one attendee."""
    ticketId: str = Field(..., description="Unique ticket ID e.g. KD-001245-T01")
    registrationId: str = Field(..., description="Parent registration ID e.g. KD-001245")
    participantId: str
    name: str  # Matches frontend ticket.name
    participantName: str
    age: int
    dob: str
    category: str = "ADULT"
    price: int = 299
    eventName: str = "Dandiya Night 2026"
    eventDate: str = "02 October 2026"
    eventTime: str = "07:00 PM - 11:30 PM"
    venue: str = "TBA"
    gate: str = "GATE 3"
    paymentStatus: str = "PENDING"
    createdAt: str
