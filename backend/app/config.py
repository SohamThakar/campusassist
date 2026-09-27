import os
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Campus"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Application Environment
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./campus_ai.db"
    
    # Security
    JWT_SECRET: str = "supersecret_campusassist_jwt_key_2026_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # Uploads & Storage Configuration
    UPLOAD_DIR: str = "./uploads"
    MAX_PHOTO_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB
    MAX_VIDEO_SIZE_BYTES: int = 50 * 1024 * 1024 # 50MB
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # AI & Duplicate Detection Configuration
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    DUPLICATE_THRESHOLD_HIGH: float = 0.80
    DUPLICATE_THRESHOLD_MEDIUM: float = 0.55
    DUPLICATE_CANDIDATE_LIMIT: int = 10
    DUPLICATE_SEARCH_DAYS: int = 30
    SIMULATE_AI_FAILURE: bool = False
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip().strip("'\"") for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
