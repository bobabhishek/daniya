from typing import Dict, Any, Optional
from datetime import datetime
import logging
from ..config import settings
from ..models.payment import PaymentOrder, PaymentVerificationResponse
from ..services.id_service import IdService
from ..services.ocr_service import OcrService
from ..services.receipt_storage_service import ReceiptStorageService
from ..services.registration_service import RegistrationService
from ..services.ticket_service import TicketService

logger = logging.getLogger("dandiya_backend.payments")


class PaymentService:
    """
    Authoritative Payment & OCR Verification Engine.
    Enforces the Three-Way Amount Match Rule:
        expectedAmount == enteredAmount == ocrAmount
    """

    @staticmethod
    def create_payment_order(registration_id: str, amount: int) -> PaymentOrder:
        order_id = f"ORDER-{IdService.generate_transaction_id().replace('TXN-', '')}"
        return PaymentOrder(
            orderId=order_id,
            registrationId=registration_id,
            amount=amount,
            currency="INR",
            status="PENDING",
            payeeName="ARPITH MANOHAR",
            qrImageUrl="/assets/admin_qr_arpith.jpg",
            createdAt=datetime.now().isoformat()
        )

    @staticmethod
    def verify_payment_receipt(
        registration_id: str,
        entered_amount: int,
        image_bytes: bytes,
        filename: str = "payment_receipt.jpg",
        content_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Executes strict three-way verification:
        1. EXPECTED AMOUNT (Authoritative from Step 1 / backend registration)
        2. USER ENTERED AMOUNT (Entered manually after receipt upload)
        3. OCR AMOUNT (Extracted by RapidOCR from uploaded screenshot)
        """
        record = RegistrationService.get_registration(registration_id)
        if not record:
            return {
                "success": False,
                "registrationId": registration_id,
                "expectedAmount": 0,
                "enteredAmount": entered_amount,
                "ocrAmount": None,
                "paymentStatus": "FAILED",
                "verificationStatus": "FAILED",
                "registrationStatus": "PENDING",
                "message": f"Registration {registration_id} not found.",
                "mismatchReason": "Registration record does not exist."
            }

        # Check if already verified
        if record.get("verificationStatus") == "VERIFIED" and record.get("ticketIds"):
            return {
                "success": True,
                "registrationId": registration_id,
                "expectedAmount": record.get("expectedAmount", record.get("totalAmount", 0)),
                "enteredAmount": record.get("enteredAmount", entered_amount),
                "ocrAmount": record.get("ocrAmount"),
                "ocrConfidence": record.get("ocrConfidence"),
                "paymentStatus": "PAID",
                "verificationStatus": "VERIFIED",
                "registrationStatus": "CONFIRMED",
                "transactionId": record.get("transactionId"),
                "receiptPath": record.get("receiptPath"),
                "ticketIds": record.get("ticketIds", []),
                "message": "Payment already verified. Tickets are active."
            }

        # 1. Authoritative Expected Amount
        # If Arpith manually approved a concession, finalApprovedAmount takes precedence
        expected_amount = (
            record.get("finalApprovedAmount")
            or record.get("expectedAmount")
            or record.get("totalAmount")
            or record.get("amount")
            or 0
        )

        # 2. Extract OCR Amount and Metadata from Screenshot
        ocr_result = OcrService.process_receipt(image_bytes)
        ocr_amount = ocr_result.get("detected_amount")
        ocr_confidence = ocr_result.get("confidence", 0.0)
        upi_ref = ocr_result.get("upi_reference")

        logger.info(
            f"Verification Attempt for {registration_id}: "
            f"Expected={expected_amount}, Entered={entered_amount}, OCR={ocr_amount} (conf={ocr_confidence})"
        )

        # 3. Three-Way Amount Comparison
        entered_matches = (entered_amount == expected_amount)
        ocr_matches = (ocr_amount is not None) and (ocr_amount == expected_amount)
        all_three_match = entered_matches and ocr_matches

        # =========================================================================
        # CASE A: ALL THREE VALUES MATCH -> VERIFIED
        # =========================================================================
        if all_three_match:
            logger.info(f"Payment MATCH verified for {registration_id}! Saving receipt locally...")

            # Save verified receipt locally to receipts/{registrationId}/payment_receipt.jpg
            receipt_path = ReceiptStorageService.save_verified_receipt(
                registration_id=registration_id,
                image_bytes=image_bytes,
                filename=filename
            )

            # Issue tickets & update Firestore
            updated_record = RegistrationService.mark_payment_verified(
                registration_id=registration_id,
                entered_amount=entered_amount,
                ocr_amount=ocr_amount,
                ocr_confidence=ocr_confidence,
                receipt_path=receipt_path,
                transaction_id=upi_ref,
                original_filename=filename
            )

            ticket_ids = updated_record.get("ticketIds", []) if updated_record else []

            # Fetch full ticket objects for immediate frontend display
            full_tickets = TicketService.list_tickets_for_registration(registration_id)

            return {
                "success": True,
                "registrationId": registration_id,
                "expectedAmount": expected_amount,
                "enteredAmount": entered_amount,
                "ocrAmount": ocr_amount,
                "ocrConfidence": ocr_confidence,
                "paymentStatus": "PAID",
                "verificationStatus": "VERIFIED",
                "registrationStatus": "CONFIRMED",
                "transactionId": upi_ref or updated_record.get("transactionId"),
                "receiptPath": receipt_path,
                "ticketIds": ticket_ids,
                "tickets": [t if isinstance(t, dict) else t.model_dump() for t in full_tickets],
                "message": "Payment verified successfully! Your tickets have been issued."
            }

        # =========================================================================
        # CASE B: ANY VALUE DOES NOT MATCH -> REJECTED
        # (NO receipt storage, NO permanent file, NO tickets generated!)
        # =========================================================================
        # Ensure any unverified receipt directory is cleaned up
        ReceiptStorageService.delete_receipt(registration_id)
        if ocr_amount is None:
            mismatch_reason = (
                "Payment screenshot could not be verified. "
                "Please upload a clearer screenshot showing the payment amount."
            )
        elif not entered_matches and not ocr_matches:
            mismatch_reason = (
                f"Entered amount (₹{entered_amount}) and detected amount (₹{ocr_amount}) "
                f"do not match the expected registration total (₹{expected_amount})."
            )
        elif not entered_matches:
            mismatch_reason = (
                f"Amount entered (₹{entered_amount}) does not match the expected total (₹{expected_amount})."
            )
        else:
            mismatch_reason = (
                f"Detected receipt amount (₹{ocr_amount}) does not match the expected total (₹{expected_amount})."
            )

        logger.warning(
            f"Payment verification REJECTED for {registration_id}: {mismatch_reason} "
            f"(Expected: {expected_amount}, Entered: {entered_amount}, Detected: {ocr_amount})"
        )

        return {
            "success": False,
            "registrationId": registration_id,
            "expectedAmount": expected_amount,
            "enteredAmount": entered_amount,
            "ocrAmount": ocr_amount,
            "ocrConfidence": ocr_confidence,
            "paymentStatus": "PENDING",
            "verificationStatus": "FAILED",
            "registrationStatus": "PENDING",
            "ticketIds": [],
            "message": "Payment verification failed. Payment amount could not be verified.",
            "mismatchReason": mismatch_reason
        }
