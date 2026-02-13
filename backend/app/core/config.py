# Core configuration
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os


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
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # CORS — accepts comma-separated string from env, e.g. "https://app.example.com,http://localhost:3000"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip().strip('"').strip("'") for origin in v.split(",") if origin.strip()]
        return v
    
    # Application Settings
    FOLLOW_UP_DAYS: int = 3
    MAX_FOLLOW_UPS: int = 2
    WEASYPRINT_TIMEOUT: int = 30
    
    # Brand Mode: wally | decostrefa | both
    BRAND_MODE: str = "both"
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
