import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .firebase import init_firebase, get_db
from .routes import registrations, payments, users, admin, tickets

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
    
    # Pre-seed sample registrations if database is empty
    db = get_db()
    existing_docs = list(db.collection("registrations").stream())
    if len(existing_docs) == 0:
        logger.info("Seeding initial reference registrations...")
        from .seed_data import SEED_REGISTRATIONS
        from .services.ticket_service import TicketService
        for item in SEED_REGISTRATIONS:
            reg_id = item["registrationId"]
            db.collection("registrations").document(reg_id).set(item)
            for p in item.get("participants", []):
                t_obj = TicketService.build_ticket(
                    registration_id=reg_id,
                    ticket_id=p["ticketId"],
                    participant=p,
                    payment_status=item.get("paymentStatus", "PAID")
                )
                TicketService.save_tickets([t_obj])
        logger.info(f"Seeded {len(SEED_REGISTRATIONS)} records successfully.")

    yield
    logger.info("Shutting down backend service.")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Official backend API for Karkala's Dandiya & Garba Mahotsav 2026",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
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
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
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
