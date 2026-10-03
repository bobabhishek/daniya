from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from ..models.registration import RegistrationRecord
from ..models.ticket import TicketRecord
from ..services.registration_service import RegistrationService
from ..services.ticket_service import TicketService
from ..services.receipt_storage_service import ReceiptStorageService
from ..services.excel_export_service import ExcelExportService
from ..utils.security import get_current_admin
from ..config import settings
from ..firebase import get_db

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])


@router.get("/stats")
async def get_admin_stats(
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """
    Retrieve real-time aggregate booking metrics for the Organizer Dashboard.
    """
    stats = RegistrationService.calculate_admin_stats()
    return stats


@router.get("/registrations", response_model=List[RegistrationRecord])
async def list_admin_registrations(
    payment_status: Optional[str] = Query(None, description="Filter by status: PAID, PENDING, FAILED"),
    search: Optional[str] = Query(None, description="Search by ID or participant name"),
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """List all master registrations with optional search and payment filtering."""
    records = RegistrationService.list_all_registrations()

    filtered = []
    for r in records:
        if payment_status and payment_status != "ALL":
            if r.get("paymentStatus") != payment_status:
                continue
        if search and search.strip():
            term = search.strip().lower()
            reg_id = r.get("registrationId", "").lower()
            summary = r.get("participantsSummary", "").lower()
            if term not in reg_id and term not in summary:
                continue
        filtered.append(r)

    return filtered


@router.get("/registrations/{registration_id}", response_model=RegistrationRecord)
async def get_admin_registration(
    registration_id: str,
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """Retrieve full audit record for a single registration dossier."""
    record = RegistrationService.get_registration(registration_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration {registration_id} not found."
        )
    return record


@router.get("/registrations/{registration_id}/receipt")
async def get_admin_registration_receipt(
    registration_id: str,
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """
    Retrieve verified payment screenshot from local storage for Organizer inspection.
    Streams image directly to Admin Dashboard modal.
    """
    record = RegistrationService.get_registration(registration_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration {registration_id} not found."
        )

    # Try lookup via registration_id first, then fallback to record.get("receiptPath")
    receipt_data = ReceiptStorageService.get_receipt_bytes(registration_id)
    if not receipt_data and record.get("receiptPath"):
        receipt_data = ReceiptStorageService.get_receipt_bytes(record["receiptPath"])

    if not receipt_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt unavailable"
        )

    image_bytes, mime_type = receipt_data
    return Response(content=image_bytes, media_type=mime_type)


@router.get("/export-excel", summary="Download Master Excel Workbook with embedded payment screenshots")
@router.get("/registrations/export-excel", summary="Download Master Excel Workbook with embedded payment screenshots (alias)")
async def export_admin_master_excel(
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """
    Generates and downloads the self-contained Master Excel (.xlsx) file.
    Includes all registrations and physically embeds verified payment screenshot
    images inside Column G for offline viewing in Microsoft Excel.
    Configurable public domain is used for ticket and receipt links.
    """
    from datetime import date
    records = RegistrationService.list_all_registrations()
    excel_bytes = ExcelExportService.generate_master_excel(
        records,
        base_url=settings.PUBLIC_APP_URL
    )

    today_str = date.today().isoformat()
    filename = f"Dandiya_Master_Registrations_{today_str}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/tickets", response_model=List[TicketRecord])
async def list_admin_tickets(
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """List all issued tickets for audit / entry gate scanner."""
    db = get_db()
    all_tickets = []
    for doc in db.collection("tickets").stream():
        if doc.exists:
            all_tickets.append(doc.to_dict())
    return all_tickets


@router.get("/tickets/{ticket_id}", response_model=TicketRecord)
async def get_admin_ticket(
    ticket_id: str,
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """Inspect single admission pass details."""
    ticket = TicketService.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket {ticket_id} not found."
        )
    return ticket
