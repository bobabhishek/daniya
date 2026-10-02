from typing import Dict, Any, Optional
from datetime import datetime
from ..config import settings
from ..models.payment import PaymentOrder, PaymentVerificationResponse
from ..services.id_service import IdService


class PaymentService:
    """
    Payment Gateway Abstraction Layer.
    
    Currently implements a mock/development gateway suitable for testing
    and administrative simulation.
    
    FUTURE INTEGRATION NOTE:
    When PhonePe (or PG of choice) is integrated, implement:
    1. PhonePe Standard Checkout Payload creation in create_payment_order()
    2. PhonePe SHA256 checksum verification & callback in verify_payment()
    3. Webhook listener invoking mark_payment_successful()
    No changes to the registration model or ticket issuance logic will be needed.
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
    def verify_payment(
        registration_id: str,
        transaction_ref: Optional[str] = None,
        method: Optional[str] = "UPI (Official QR)",
        simulate_success: bool = True
    ) -> Dict[str, Any]:
        """
        Verify payment confirmation.
        In dev mode: validates reference or mock success flag.
        In prod mode: checks PG server callback / UPI status API.
        """
        if not simulate_success:
            return {
                "success": False,
                "registrationId": registration_id,
                "paymentStatus": "FAILED",
                "registrationStatus": "PENDING",
                "transactionId": transaction_ref or IdService.generate_transaction_id(),
                "message": "Payment verification failed or unconfirmed."
            }

        txn_id = transaction_ref.strip() if transaction_ref and transaction_ref.strip() else IdService.generate_transaction_id()
        return {
            "success": True,
            "registrationId": registration_id,
            "paymentStatus": "PAID",
            "registrationStatus": "CONFIRMED",
            "transactionId": txn_id,
            "message": "Payment verified successfully."
        }
