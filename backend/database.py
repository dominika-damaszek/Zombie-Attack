import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# ── Database: Neon PostgreSQL only ────────────────────────────────────────────
# This project exclusively uses Neon as the database.
# Replit's built-in PostgreSQL (DATABASE_URL / PGHOST / etc.) is NOT used.
# Set NEON_DATABASE_URL to your Neon connection string in the environment secrets.
# ─────────────────────────────────────────────────────────────────────────────
SQLALCHEMY_DATABASE_URL = os.getenv("NEON_DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise RuntimeError(
        "NEON_DATABASE_URL environment variable is not set. "
        "This project only runs with Neon PostgreSQL. "
        "Add your Neon connection string as NEON_DATABASE_URL in the environment secrets."
    )

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    connect_args={"connect_timeout": 10},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
