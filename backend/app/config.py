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
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    ADMIN_EMAIL: str = "teamredhawkz@gmail.com"
    PUBLIC_APP_URL: str = "http://localhost:5173"  # Production: https://YOUR-DEPLOYED-DOMAIN

    # Firebase Admin Settings
    FIREBASE_PROJECT_ID: str = "dhandiya-hawkz"
    FIREBASE_CREDENTIALS_PATH: str = ""  # Path to serviceAccountKey.json if present
    USE_EMULATOR_OR_MEMORY: bool = True  # Graceful fallback when serviceAccountKey is not mounted

    # Local Receipt Storage Settings
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

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
