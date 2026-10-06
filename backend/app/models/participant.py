from typing import Optional
from pydantic import BaseModel, Field, field_validator
import re


def normalize_indian_phone_number(value: str) -> str:
    """Normalize a phone number to the canonical 10-digit Indian mobile format."""
    digits = re.sub(r"\D", "", (value or "").strip())
    if len(digits) == 10 and digits.startswith(tuple("6789")):
        return digits
    return digits


class ParticipantInput(BaseModel):
    """Input received from attendee during registration."""
    name: str = Field(..., min_length=2, max_length=100, description="Full legal name of the participant")
    dob: str = Field(..., description="Date of birth in DD/MM/YYYY format")
    phoneNumber: str = Field(..., description="Indian mobile number for this participant")
    age: Optional[int] = Field(None, ge=1, le=100, description="Attendee age (verified by server from DOB)")
    idProofType: Optional[str] = Field("Aadhaar Card (with DOB)", description="Type of physical ID to present at gate")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Participant name must be at least 2 characters long")
        return cleaned

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, v: str) -> str:
        pattern = r"^\d{2}/\d{2}/\d{4}$"
        if not re.match(pattern, v.strip()):
            raise ValueError("Date of Birth must strictly be in DD/MM/YYYY format")
        return v.strip()

    @field_validator("phoneNumber")
    @classmethod
    def validate_phone_number(cls, v: str) -> str:
        cleaned = normalize_indian_phone_number(v)
        if not re.fullmatch(r"\d{10}", cleaned) or not cleaned.startswith(tuple("6789")):
            raise ValueError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.")
        return cleaned


class ParticipantRecord(BaseModel):
    """Stored participant record linked to a master registration."""
    id: str = Field(..., description="Participant ID e.g. p1, p2")
    participantId: str = Field(..., description="Canonical participant ID")
    name: str
    age: int
    dob: str
    phoneNumber: Optional[str] = Field(None, description="Indian mobile number for this attendee")
    category: str = Field(..., description="'STUDENT' or 'ADULT'")
    price: int = Field(..., description="Calculated ticket fee in INR")
    ticketId: Optional[str] = Field(None, description="Assigned ticket pass ID e.g. KD-001245-T01 (assigned only after verification)")
    idProofType: Optional[str] = "Aadhaar Card (with DOB)"
