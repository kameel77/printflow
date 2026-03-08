# Core configuration
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "PrintFlow MIS"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "postgresql://printflow:changeme@localhost:5432/printflow"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # Security
    JWT_SECRET: str = "your-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 525600 # 365 days
    
    # Google OAuth2
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/callback"
    
    # CORS — comma-separated string, e.g. "https://app.example.com,http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into a list, stripping whitespace and quotes."""
        return [
            origin.strip().strip('"').strip("'")
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]
    
    # Application Settings
    FOLLOW_UP_DAYS: int = 3
    MAX_FOLLOW_UPS: int = 2
    WEASYPRINT_TIMEOUT: int = 30
    
    # Brand Mode: wally | decostrefa | both
    BRAND_MODE: str = "both"
    
    # Company Info (for offers/PDFs)
    COMPANY_NAME: str = "Satto Media"
    COMPANY_PHONE: str = ""
    COMPANY_EMAIL: str = ""
    COMPANY_NIP: str = ""
    COMPANY_ADDRESS: str = ""
    
    # Offer defaults
    OFFER_DEFAULT_VALIDITY_DAYS: int = 14
    OFFER_PUBLIC_BASE_URL: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
