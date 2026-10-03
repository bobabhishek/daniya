import re
import secrets
import string
import logging
import threading
from typing import Optional
from ..firebase import get_db

logger = logging.getLogger("dandiya_backend.id_service")

_memory_counter_lock = threading.Lock()


class IdService:
    """
    Authoritative Persistent ID Generator for Master Registrations and Passes.
    Enforces sequential, realistic IDs:
      Registrations: KD-000001, KD-000002, KD-000003...
      Tickets:       KD-000001-T01, KD-000001-T02...
    """

    COUNTER_COLLECTION = "counters"
    COUNTER_DOC_ID = "registration_sequence"

    @classmethod
    def _scan_max_registration_sequence(cls, db) -> int:
        """Highest numeric suffix among existing KD-XXXXXX registration IDs."""
        max_existing = 0
        try:
            for doc in db.collection("registrations").stream():
                reg_id = doc.id
                if not reg_id:
                    data = doc.to_dict() or {}
                    reg_id = data.get("registrationId", "")
                m = re.match(r"^KD-(\d{6})$", reg_id)
                if m:
                    val = int(m.group(1))
                    if val > max_existing:
                        max_existing = val
        except Exception as e:
            logger.warning(f"Error scanning existing registrations for sequence: {e}")
        return max_existing

    @classmethod
    def _allocate_next_sequence(cls, db) -> int:
        """
        Atomically allocate the next registration sequence number.
        Uses Firestore transactions when available; falls back to a memory lock.
        """
        counter_ref = db.collection(cls.COUNTER_COLLECTION).document(cls.COUNTER_DOC_ID)

        # Real Firestore: transactional increment
        try:
            from google.cloud.firestore import transactional

            @transactional
            def _txn_increment(transaction):
                snap = counter_ref.get(transaction=transaction)
                if snap.exists:
                    current = (snap.to_dict() or {}).get("current", 0)
                else:
                    current = cls._scan_max_registration_sequence(db)
                next_seq = int(current) + 1
                transaction.set(
                    counter_ref,
                    {"current": next_seq, "updatedAt": f"KD-{next_seq:06d}"},
                    merge=True,
                )
                return next_seq

            return _txn_increment(db.transaction())
        except Exception:
            pass

        # In-memory / dev fallback
        with _memory_counter_lock:
            counter_snap = counter_ref.get()
            if counter_snap.exists:
                current_seq = (counter_snap.to_dict() or {}).get("current", 0)
            else:
                current_seq = cls._scan_max_registration_sequence(db)

            next_seq = int(current_seq) + 1
            counter_ref.set({"current": next_seq, "updatedAt": f"KD-{next_seq:06d}"})
            return next_seq

    @classmethod
    def get_next_registration_id(cls) -> str:
        """
        Determines the next persistent sequential registration ID:
        KD-000001, KD-000002, KD-000003...
        Persists the counter in Firestore/counters/registration_sequence.
        """
        db = get_db()
        next_seq = cls._allocate_next_sequence(db)
        reg_id = f"KD-{next_seq:06d}"

        while db.collection("registrations").document(reg_id).get().exists:
            next_seq += 1
            reg_id = f"KD-{next_seq:06d}"
            try:
                db.collection(cls.COUNTER_COLLECTION).document(cls.COUNTER_DOC_ID).set(
                    {"current": next_seq, "updatedAt": reg_id},
                    merge=True,
                )
            except Exception as e:
                logger.error(f"Failed to persist registration counter after collision: {e}")

        logger.info(f"Assigned sequential registration ID: {reg_id} (sequence #{next_seq})")
        return reg_id

    @classmethod
    def generate_registration_id(cls) -> str:
        """Alias for backward compatibility - calls get_next_registration_id."""
        return cls.get_next_registration_id()

    @staticmethod
    def generate_ticket_id(registration_id: str, index: int) -> str:
        """
        Generate ticket ID based strictly on registration ID + participant index (0-based):
        KD-000001 -> KD-000001-T01, KD-000001-T02...
        """
        pad_index = str(index + 1).zfill(2)
        return f"{registration_id}-T{pad_index}"

    @staticmethod
    def generate_transaction_id() -> str:
        """Generate unique payment transaction reference."""
        chars = string.ascii_uppercase + string.digits
        token = "".join(secrets.choice(chars) for _ in range(8))
        return f"TXN-{token}"

