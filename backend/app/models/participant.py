from typing import Optional
from pydantic import BaseModel, Field, field_validator
import re


class ParticipantInput(BaseModel):
    """Input received from attendee during registration."""
    name: str = Field(..., min_length=2, max_length=100, description="Full legal name of the participant")
    dob: str = Field(..., description="Date of birth in DD/MM/YYYY format")
    phone: Optional[str] = Field(None, description="10-digit Indian mobile number")
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

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = re.sub(r"\D", "", str(v).strip())
        if len(cleaned) == 12 and cleaned.startswith("91"):
            cleaned = cleaned[2:]
        elif len(cleaned) == 11 and cleaned.startswith("0"):
            cleaned = cleaned[1:]
        if not cleaned:
            return None
        if not re.match(r"^[6-9]\d{9}$", cleaned):
            raise ValueError("Phone number must be a valid 10-digit Indian mobile number")
        return cleaned


class ParticipantRecord(BaseModel):
    """Stored participant record linked to a master registration."""
    id: str = Field(..., description="Participant ID e.g. p1, p2")
    participantId: str = Field(..., description="Canonical participant ID")
    name: str
    phone: Optional[str] = Field(None, description="10-digit Indian mobile number")
    age: int
    dob: str
    category: str = Field(..., description="'STUDENT' or 'ADULT'")
    price: int = Field(..., description="Calculated ticket fee in INR")
    ticketId: Optional[str] = Field(None, description="Assigned ticket pass ID e.g. KD-001245-T01 (assigned only after verification)")
    idProofType: Optional[str] = "Aadhaar Card (with DOB)"
