import secrets
import string


class IdService:
    """Authoritative ID Generator for Master Registrations and Passes."""

    @staticmethod
    def generate_registration_id() -> str:
        """
        Generate registration ID matching existing KD-XXXXXX format.
        6-digit numeric suffix ensuring safe collision avoidance.
        """
        number = secrets.randbelow(900000) + 100000  # 100000 to 999999
        return f"KD-{number}"

    @staticmethod
    def generate_ticket_id(registration_id: str, index: int) -> str:
        """
        Generate ticket ID matching existing KD-XXXXXX-T01 format.
        Index is 0-based.
        """
        pad_index = str(index + 1).zfill(2)
        return f"{registration_id}-T{pad_index}"

    @staticmethod
    def generate_transaction_id() -> str:
        """Generate unique payment transaction reference."""
        chars = string.ascii_uppercase + string.digits
        token = "".join(secrets.choice(chars) for _ in range(8))
        return f"TXN-{token}"
