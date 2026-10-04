import time
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status, Depends
from anyio import to_thread
from ..config import settings
from ..firebase import verify_id_token


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    FastAPI dependency to extract and verify Firebase ID Token.
    Returns decoded token dictionary containing 'uid', 'email', 'name', etc.
    Offloads synchronous verification to worker threads to keep event loop free.
    """
    t0 = time.perf_counter()
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    parts = authorization.strip().split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = parts[1]
    t_extracted = (time.perf_counter() - t0) * 1000
    try:
        t_verify_start = time.perf_counter()
        decoded = await to_thread.run_sync(verify_id_token, token)
        t_verify = (time.perf_counter() - t_verify_start) * 1000
        t_total = (time.perf_counter() - t0) * 1000
        print(f"[DIAGNOSTIC] get_current_user: token_extract={t_extracted:.3f} ms, verify_id_token={t_verify:.2f} ms, total_auth={t_total:.2f} ms", flush=True)
        return decoded
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_current_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    FastAPI dependency to verify that the authenticated user is an authorized Admin.
    Checks admin email allowlist and/or custom claim 'admin' == True.
    """
    user_email = (user.get("email") or "").strip().lower()
    is_admin_email = user_email == settings.ADMIN_EMAIL.strip().lower()
    has_admin_claim = user.get("admin") is True

    if not (is_admin_email or has_admin_claim):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Organizer administrative privileges required."
        )

    return user


async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Optional user authentication helper."""
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
