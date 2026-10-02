from datetime import datetime, date
from typing import List, Tuple, Dict, Any, Optional
from ..config import settings
from ..models.participant import ParticipantInput


def parse_indian_date(date_str: str) -> Optional[date]:
    """Parse DD/MM/YYYY into a python date object."""
    if not date_str:
        return None
    try:
        # Handles DD/MM/YYYY or DD-MM-YYYY
        cleaned = date_str.strip().replace("-", "/")
        parts = cleaned.split("/")
        if len(parts) == 3:
            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
            return date(year, month, day)
    except (ValueError, IndexError):
        pass
    return None


def calculate_age_from_dob(dob_str: str, reference_date: Optional[date] = None) -> int:
    """Calculate attendee age strictly from DD/MM/YYYY format."""
    parsed = parse_indian_date(dob_str)
    if not parsed:
        return 0
    ref = reference_date or date.today()
    age = ref.year - parsed.year - ((ref.month, ref.day) < (parsed.month, parsed.day))
    return max(0, age)


class PricingService:
    """
    Authoritative Server-Side Pricing Engine.
    
    Current Business Rule:
    - Standard online registration charges ₹299 per pass across all attendees.
    - Attendees age <= 20 qualify for the student category, but student concessions (₹199)
      are handled directly via Arpith Hawkz (offline/disclaimer).
    - Never trusts the amount or pricing calculation sent from the client.
    """

    @staticmethod
    def calculate_breakdown(
        participants: List[ParticipantInput],
        apply_student_discount: bool = False
    ) -> Dict[str, Any]:
        under_20_count = 0
        above_20_count = 0
        participant_details = []
        total_amount = 0

        for idx, p in enumerate(participants):
            p_id = f"p{idx + 1}"
            calc_age = calculate_age_from_dob(p.dob)
            if calc_age == 0 and p.age and p.age > 0:
                calc_age = p.age

            is_under_20 = calc_age <= settings.STUDENT_AGE_MAX

            if is_under_20:
                under_20_count += 1
                category = "STUDENT"
                # If explicit authorized concession is active, charge 199, else standard 299
                ticket_price = settings.STUDENT_DISCOUNT_PRICE if apply_student_discount else settings.ADULT_PRICE
            else:
                above_20_count += 1
                category = "ADULT"
                ticket_price = settings.ADULT_PRICE

            total_amount += ticket_price
            participant_details.append({
                "id": p_id,
                "participantId": p_id,
                "name": p.name,
                "age": calc_age,
                "dob": p.dob,
                "category": category,
                "price": ticket_price,
                "idProofType": p.idProofType or "Aadhaar Card (with DOB)"
            })

        return {
            "total_participants": len(participants),
            "under_20_count": under_20_count,
            "above_20_count": above_20_count,
            "total_amount": total_amount,
            "participant_details": participant_details
        }
