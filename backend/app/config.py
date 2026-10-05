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
    PUBLIC_APP_URL: str = "http://localhost:5173"  # Production: https://YOUR-DEPLOYED-DOMAIN

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
