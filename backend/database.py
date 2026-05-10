import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# ── Database: Neon PostgreSQL only ────────────────────────────────────────────
# This project exclusively uses Neon as the database.
# Accepts NEON_DATABASE_URL (preferred) or DATABASE_URL as fallback.
# On Render, set NEON_DATABASE_URL to your Neon connection string.
# ─────────────────────────────────────────────────────────────────────────────
SQLALCHEMY_DATABASE_URL = os.getenv("NEON_DATABASE_URL") or os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise RuntimeError(
        "Neither NEON_DATABASE_URL nor DATABASE_URL is set. "
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
