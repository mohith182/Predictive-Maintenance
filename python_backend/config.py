"""
Configuration Module
Loads environment variables and provides app settings
"""

from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()


class Settings(BaseSettings):
    """Application Settings"""
    
    # App
    APP_NAME: str = "UptimeAI"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database - Use DATABASE_URL env variable (required in production)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./uptimeai.db"  # Default for development only
    )
    
    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "jwt-secret-change-me")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "UptimeAI"
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI",
        f"{FRONTEND_URL}/api/auth/google/callback"
    )
    
    # MFA
    OTP_VALID_SECONDS: int = 300
    OTP_ISSUER_NAME: str = "UptimeAI"
    
    # Security
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_SIGNUP: str = "3/minute"
    RATE_LIMIT_API: str = "100/minute"
    PASSWORD_MIN_LENGTH: int = 8
    
    # Frontend
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:8080")
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:8080,http://localhost:8081,http://localhost:8082,http://localhost:8083,http://localhost:8084,http://localhost:8085,http://localhost:3000,http://localhost:5173"
    )
    
    # ML
    MODEL_PATH: str = os.getenv("MODEL_PATH", "ml/model.pkl")
    MAX_RUL: int = int(os.getenv("MAX_RUL", "150"))
    INITIAL_RUL: int = int(os.getenv("INITIAL_RUL", "150"))
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    def validate_secrets(self) -> None:
        """Validate that critical secrets are not default values"""
        if self.SECRET_KEY == "change-me-in-production":
            raise ValueError(
                "SECRET_KEY must be changed from default value. "
                "Set SECRET_KEY environment variable."
            )
        if self.JWT_SECRET_KEY == "jwt-secret-change-me":
            raise ValueError(
                "JWT_SECRET_KEY must be changed from default value. "
                "Set JWT_SECRET_KEY environment variable."
            )
        if self.APP_ENV == "production" and self.DATABASE_URL.startswith("sqlite"):
            raise ValueError(
                "SQLite database is not suitable for production. "
                "Set DATABASE_URL to PostgreSQL connection string."
            )
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra env variables


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
