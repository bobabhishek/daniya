import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment or .env file."""
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Garba & Dandiya Night 2026 API"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Security & CORS & Public Deployment URLs
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175,http://localhost:3000,http://127.0.0.1:3000,http://localhost:4173,http://127.0.0.1:4173"
    ADMIN_EMAIL: str = "teamredhawkz@gmail.com"
    PUBLIC_APP_URL: str = "https://daniya-sand.vercel.app"

    # Firebase Admin Settings
    FIREBASE_PROJECT_ID: str = "dhandiya-hawkz"
    FIREBASE_CREDENTIALS_PATH: str = ""  # Path to serviceAccountKey.json if present
    FIREBASE_CREDENTIALS_JSON: str = ""  # Raw or base64-encoded service account JSON
    FIREBASE_STORAGE_BUCKET: str = "dhandiya-hawkz.firebasestorage.app"
    USE_EMULATOR_OR_MEMORY: bool = True  # Fallback only in development/testing

    # Receipt Storage Settings
    RECEIPTS_DIR: str = "receipts"

    # Business & Pricing Rules
    ADULT_PRICE: int = 299
    STUDENT_PRICE: int = 299  # Standard web checkout charges ₹299 (discount is managed offline/disclaimer)
    STUDENT_DISCOUNT_PRICE: int = 199  # Available for authorized concession vouchers
    STUDENT_AGE_MAX: int = 20

    # Event Metadata (matches frontend eventConfig - single source of truth)
    EVENT_NAME: str = "Taal Pe Nacho Re"
    EVENT_EDITION: str = "Garba & Dandiya Night 2026"
    EVENT_DATE: str = "10th October 2026"
    EVENT_TIME: str = "5:00 PM Onwards"
    EVENT_VENUE: str = "TBA"
    EVENT_LOCATION: str = "TBA"
    ORGANIZER_NAME: str = "Red Hawks School of Dance"

    # Payment simulation mode
    MOCK_PAYMENT_ENABLED: bool = True

    # OCR provider selection: use "auto" in dev/test, "huggingface" for production, and "rapidocr" only for explicit local fallback.
    OCR_PROVIDER: str = "auto"

    # Hosted OCR settings
    HF_TOKEN: str = ""
    HF_OCR_MODEL: str = "google/gemma-3-4b-it"
    HF_OCR_TIMEOUT_SECONDS: int = 15
    HF_OCR_USE_LOCAL_FALLBACK: bool = True

    def validate_production_requirements(self) -> None:
        if self.ENVIRONMENT != "production":
            return

        normalized_url = (self.PUBLIC_APP_URL or "").strip()
        if not normalized_url or normalized_url.startswith("http://localhost") or normalized_url.startswith("http://127.0.0.1"):
            normalized_url = "https://daniya-sand.vercel.app"
            self.PUBLIC_APP_URL = normalized_url

        if not self.PUBLIC_APP_URL.startswith("https://"):
            self.PUBLIC_APP_URL = "https://" + self.PUBLIC_APP_URL.lstrip("https://")

        missing: List[str] = []

        if not self.ADMIN_EMAIL:
            missing.append("ADMIN_EMAIL")
        if not self.FIREBASE_PROJECT_ID:
            missing.append("FIREBASE_PROJECT_ID")
        if not self.FIREBASE_STORAGE_BUCKET:
            missing.append("FIREBASE_STORAGE_BUCKET")

        if missing:
            # These are deployment hints, not hard blockers: actual database and storage access are
            # still enforced at the point of use to avoid breaking startup on a fresh Render instance.
            import logging
            logger = logging.getLogger("dandiya_backend.config")
            logger.warning(
                "Production deployment hints missing: %s. "
                "The app will continue startup and fail closed only when the affected feature is used.",
                ", ".join(missing),
            )

        if not self.HF_TOKEN:
            import logging
            logger = logging.getLogger("dandiya_backend.config")
            logger.warning(
                "HF_TOKEN is not configured in production; hosted OCR will fail closed until a valid token is supplied."
            )

        if not (
            self.FIREBASE_CREDENTIALS_JSON
            or self.FIREBASE_CREDENTIALS_PATH
            or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            or os.environ.get("FIREBASE_CREDENTIALS_JSON")
            or os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        ):
            import logging
            logger = logging.getLogger("dandiya_backend.config")
            logger.warning(
                "Firebase service account credentials are not configured in production. "
                "Runtime Firebase access will fail closed until secrets are added to the deployment environment."
            )

    @property
    def cors_origins(self) -> List[str]:
        raw = self.ALLOWED_ORIGINS or ""
        origins = []
        for origin in raw.split(","):
            cleaned = origin.strip().rstrip("/")
            if cleaned:
                origins.append(cleaned)
        # Ensure production Vercel frontend is always allowed
        prod_vercel = "https://daniya-sand.vercel.app"
        if prod_vercel not in origins:
            origins.append(prod_vercel)
        return origins


settings = Settings()
