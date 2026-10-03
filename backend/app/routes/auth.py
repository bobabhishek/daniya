from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from ..utils.security import get_current_user, get_optional_user
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication & Authoritative Roles"])


@router.get("/verify-role")
async def verify_authenticated_role(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Authoritative server-side role verification.
    Validates Firebase ID Token cryptographically on the server.
    Client-side inspection or localStorage overrides CANNOT alter this result.
    """
    user_email = (current_user.get("email") or "").strip().lower()
    is_admin = (
        user_email == settings.ADMIN_EMAIL.strip().lower()
        or current_user.get("admin") is True
    )

    role = "ADMIN" if is_admin else "USER"
    permissions: List[str] = [
        "view_profile",
        "book_tickets",
        "view_my_passes",
        "download_my_receipts"
    ]

    if is_admin:
        permissions.extend([
            "view_all_registrations",
            "view_financial_stats",
            "audit_payment_proofs",
            "export_master_excel",
            "scan_entry_tickets"
        ])

    return {
        "authenticated": True,
        "uid": current_user.get("uid"),
        "email": user_email,
        "name": current_user.get("name") or "User",
        "role": role,
        "isAdmin": is_admin,
        "permissions": permissions,
        "verifiedBy": "Server-Side Authoritative Authority"
    }


@router.get("/session")
async def get_current_session(
    current_user: Dict[str, Any] = Depends(get_optional_user)
) -> Dict[str, Any]:
    """
    Safely inspect current session. Returns guest info if unauthenticated.
    """
    if not current_user:
        return {
            "authenticated": False,
            "role": "GUEST",
            "isAdmin": False,
            "permissions": ["view_landing_page", "view_event_rules"]
        }

    user_email = (current_user.get("email") or "").strip().lower()
    is_admin = (
        user_email == settings.ADMIN_EMAIL.strip().lower()
        or current_user.get("admin") is True
    )

    return {
        "authenticated": True,
        "uid": current_user.get("uid"),
        "email": user_email,
        "name": current_user.get("name"),
        "role": "ADMIN" if is_admin else "USER",
        "isAdmin": is_admin
    }
