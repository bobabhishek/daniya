import os
import time
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .firebase import init_firebase, get_db
from .routes import registrations, payments, users, admin, tickets, auth

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("dandiya_backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info("Initializing Garba & Dandiya 2026 Backend...")
    init_firebase()
    
    # Pre-seed sample registrations in development mode only
    if settings.ENVIRONMENT != "production":
        db = get_db()
        from .seed_data import SEED_REGISTRATIONS
        from .services.ticket_service import TicketService
        for item in SEED_REGISTRATIONS:
            reg_id = item["registrationId"]
            doc_snap = db.collection("registrations").document(reg_id).get()
            if not doc_snap.exists:
                db.collection("registrations").document(reg_id).set(item)
                for p in item.get("participants", []):
                    t_obj = TicketService.build_ticket(
                        registration_id=reg_id,
                        ticket_id=p["ticketId"],
                        participant=p,
                        payment_status=item.get("paymentStatus", "PAID")
                    )
                    TicketService.save_tickets([t_obj])
                logger.info(f"Seeded reference registration {reg_id} successfully.")

        from .services.id_service import IdService
        max_seq = IdService._scan_max_registration_sequence(db)
        if max_seq > 0:
            db.collection(IdService.COUNTER_COLLECTION).document(IdService.COUNTER_DOC_ID).set(
                {"current": max_seq, "updatedAt": f"KD-{max_seq:06d}"},
                merge=True,
            )

    yield
    logger.info("Shutting down backend service.")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Official backend API for Karkala's Dandiya & Garba Mahotsav 2026",
    lifespan=lifespan
)

# Security Response Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Real-time HTTP Request & Status Code Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    t_start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - t_start) * 1000

    code = response.status_code
    if code < 300:
        icon = "🟢"
    elif code < 400:
        icon = "🔵"
    elif code < 500:
        icon = "🟡"
    else:
        icon = "🔴"

    client_ip = request.client.host if request.client else "unknown"
    try:
        print(f"{icon} [HTTP] {request.method:<6} {request.url.path:<30} -> {code} ({duration_ms:.1f}ms) [{client_ip}]", flush=True)
    except (UnicodeEncodeError, Exception):
        tag = "[OK]" if code < 400 else "[ERR]"
        print(f"{tag} [HTTP] {request.method:<6} {request.url.path:<30} -> {code} ({duration_ms:.1f}ms) [{client_ip}]", flush=True)
    return response

# CORS Middleware: In production, strictly restrict to configured ALLOWED_ORIGINS; in development permit localhost ports
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins or ["*"],
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register Routers
app.include_router(auth.router)
app.include_router(registrations.router)
app.include_router(payments.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(tickets.router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "event": settings.EVENT_NAME,
        "date": settings.EVENT_DATE,
        "venue": settings.EVENT_VENUE,
        "status": "online",
        "version": "1.0.0"
    }


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "adminConfigured": bool(settings.ADMIN_EMAIL),
        "adminEmail": settings.ADMIN_EMAIL
    }


# Global Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
    )
