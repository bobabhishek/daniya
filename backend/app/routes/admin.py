from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, status, Query, Response
from ..models.registration import RegistrationRecord, AdminRegistrationUpdateRequest
from ..models.ticket import TicketRecord
from ..services.registration_service import RegistrationService
from ..services.ticket_service import TicketService
from ..services.receipt_storage_service import ReceiptStorageService
from ..services.excel_export_service import ExcelExportService
from ..utils.security import get_current_admin
from ..config import settings
from ..firebase import get_db

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])

ALLOWED_DB_COLLECTIONS = {
    "registrations",
    "tickets",
    "payments",
    "receipts",
    "participants",
    "counters",
}

PROTECTED_DB_DOCUMENTS = {
    "counters": {"registration_sequence"}
}


def _normalize_collection_name(collection_name: str) -> str:
    if not collection_name or not isinstance(collection_name, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid Firestore collection name is required."
        )

    normalized = collection_name.strip().lower()
    if normalized not in ALLOWED_DB_COLLECTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Collection '{collection_name}' is not allowed for admin database management."
        )
    return normalized


@router.get("/db/collections")
async def list_database_collections(
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """Return the safe collection list for the protected admin Firestore editor."""
    return sorted(ALLOWED_DB_COLLECTIONS)


@router.get("/db/{collection}")
async def list_database_documents(
    collection: str,
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """List every document in an approved collection."""
    collection_name = _normalize_collection_name(collection)
    db = get_db()
    docs = []
    for document in db.collection(collection_name).stream():
        if document.exists:
            docs.append({
                "id": document.id,
                "data": document.to_dict() or {}
            })
    return docs


@router.get("/db/{collection}/{document_id}")
async def get_database_document(
    collection: str,
    document_id: str,
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """Return a single document from the approved Firestore collection."""
    collection_name = _normalize_collection_name(collection)
    db = get_db()
    document = db.collection(collection_name).document(document_id).get()
    if not document.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' does not exist in '{collection_name}'."
        )
    return document.to_dict() or {}


@router.post("/db/{collection}", status_code=status.HTTP_201_CREATED)
async def create_database_document(
    collection: str,
    payload: Dict[str, Any] = Body(...),
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """Create a new document within an approved Firestore collection."""
    collection_name = _normalize_collection_name(collection)
    document_id = str(payload.get("documentId") or payload.get("id") or '').strip()
    if not document_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A documentId is required when creating a database record."
        )

    if collection_name in PROTECTED_DB_DOCUMENTS and document_id in PROTECTED_DB_DOCUMENTS[collection_name]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Document '{document_id}' in '{collection_name}' is protected and cannot be created or modified via the admin database editor."
        )

    data = payload.get("data", payload)
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database document data must be a JSON object."
        )

    db = get_db()
    ref = db.collection(collection_name).document(document_id)
    if ref.get().exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Document '{document_id}' already exists in '{collection_name}'."
        )

    ref.set(data)
    return data


@router.patch("/db/{collection}/{document_id}")
async def update_database_document(
    collection: str,
    document_id: str,
    payload: Dict[str, Any] = Body(...),
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """Update an approved Firestore document with optional replace semantics and protected counter guardrails."""
    collection_name = _normalize_collection_name(collection)
    if collection_name in PROTECTED_DB_DOCUMENTS and document_id in PROTECTED_DB_DOCUMENTS[collection_name]:
        if not bool(payload.get("confirmCounterOverride")):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The registration_sequence counter is protected. Override is required to edit this document."
            )

    data = payload.get("data", payload)
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database document data must be a JSON object."
        )

    db = get_db()
    ref = db.collection(collection_name).document(document_id)
    current = ref.get()
    if not current.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' does not exist in '{collection_name}'."
        )

    next_data = data if payload.get("replace", True) else {**(current.to_dict() or {}), **data}
    ref.set(next_data)
    return next_data


@router.delete("/db/{collection}/{document_id}")
async def delete_database_document(
    collection: str,
    document_id: str,
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """Delete a single Firestore document from an approved collection while protecting critical counters."""
    collection_name = _normalize_collection_name(collection)
    if collection_name in PROTECTED_DB_DOCUMENTS and document_id in PROTECTED_DB_DOCUMENTS[collection_name]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Document '{document_id}' in '{collection_name}' is protected and cannot be deleted from the admin database editor."
        )

    db = get_db()
    ref = db.collection(collection_name).document(document_id)
    if not ref.get().exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' does not exist in '{collection_name}'."
        )

    ref.delete()
    return {"deleted": True, "collection": collection_name, "id": document_id}


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


@router.patch("/registrations/{registration_id}", response_model=RegistrationRecord)
async def update_admin_registration(
    registration_id: str,
    payload: AdminRegistrationUpdateRequest,
    admin_user: Dict[str, Any] = Depends(get_current_admin)
):
    """Allow an authorized admin to update participant fields while preserving all system-controlled data."""
    try:
        updated = RegistrationService.update_registration(registration_id, payload.model_dump(exclude_none=True))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        ) from exc

    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration {registration_id} not found."
        )

    return updated


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
