from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.database.config import db_config

# Construct standard PostgreSQL database URL
# Handle empty passwords cleanly
password_part = f":{db_config.PASSWORD}" if db_config.PASSWORD else ""
DATABASE_URL = db_config.DATABASE_URL or f"postgresql://{db_config.USER}{password_part}@{db_config.HOST}:{db_config.PORT}/{db_config.DATABASE}"

engine = create_engine(
    DATABASE_URL,
    pool_size=db_config.MIN_CONNECTIONS,
    max_overflow=max(5, db_config.MAX_CONNECTIONS - db_config.MIN_CONNECTIONS),
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    SQLAlchemy database session dependency.
    Yields a session and automatically closes it when request context ends.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
