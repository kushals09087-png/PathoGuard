"""Application configuration for Genome Firewall API."""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True)

    APP_NAME: str = "Genome Firewall API"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Environment & Security
    ENV: str = os.getenv("ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "genome-firewall-secure-secret-key-32bytes-minimum")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]
    
    # Upload limits
    MAX_UPLOAD_BYTES: int = 50 * 1024 * 1024  # 50 MB
    
    # Storage
    STORAGE_DIR: str = os.getenv("FILE_STORAGE_PATH", "data/storage")

    # Worker
    INLINE_WORKER: bool = os.getenv("INLINE_WORKER", "false").lower() == "true"
    
    # Mandatory disclaimer
    DISCLAIMER: str = "For research and surveillance use only. Not for clinical diagnosis or treatment decisions."


settings = Settings()
