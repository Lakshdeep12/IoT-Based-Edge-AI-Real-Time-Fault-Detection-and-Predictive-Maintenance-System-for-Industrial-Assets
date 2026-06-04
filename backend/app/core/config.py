from typing import Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Predictive Maintenance Hub"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    
    # JWT Settings
    SECRET_KEY: str = "change-this-long-random-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for ease of development/demo
    
    # Database Settings
    DATABASE_URL: Optional[str] = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "predictive_maintenance_hub"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    DB_MIN_CONN: int = 1
    DB_MAX_CONN: int = 10
    AUTO_CREATE_TABLES: bool = True

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # Gemini API Key for Diagnostic Remediation
    GEMINI_API_KEY: Optional[str] = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.ENVIRONMENT.lower() == "production":
            if self.SECRET_KEY == "change-this-long-random-secret":
                raise ValueError("Set a strong SECRET_KEY before running in production.")
            if not self.DATABASE_URL and not self.DB_PASSWORD:
                raise ValueError("Set DATABASE_URL or DB_PASSWORD before running in production.")
            if "*" in self.cors_origins_list:
                raise ValueError("CORS_ORIGINS cannot contain '*' in production.")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
