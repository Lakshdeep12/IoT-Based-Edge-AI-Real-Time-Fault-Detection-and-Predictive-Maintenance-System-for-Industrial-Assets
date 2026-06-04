"""
backend/app/database/config.py
Database configuration — reads from environment or .env file.
"""
import os
from dataclasses import dataclass
from dotenv import load_dotenv

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# Load from backend/.env, the previous local database .env location, then CWD.
load_dotenv(dotenv_path=os.path.join(BACKEND_DIR, ".env"))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv()

@dataclass(frozen=True)
class DatabaseConfig:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    HOST: str = os.getenv("DB_HOST", "localhost")
    PORT: int = int(os.getenv("DB_PORT", 5432))
    DATABASE: str = os.getenv("DB_NAME", "predictive_maintenance_hub")
    USER: str = os.getenv("DB_USER", "postgres")
    PASSWORD: str = os.getenv("DB_PASSWORD", "")
    MIN_CONNECTIONS: int = int(os.getenv("DB_MIN_CONN", 1))
    MAX_CONNECTIONS: int = int(os.getenv("DB_MAX_CONN", 10))

db_config = DatabaseConfig()
