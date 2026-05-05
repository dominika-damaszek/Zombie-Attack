"""
database.py – SQLAlchemy engine + session factory for Zombieware.

Connection string is read from the DATABASE_URL environment variable, which
should be set in backend/.env (copy from .env.example and fill in your Neon
connection string).

Neon requires SSL, so the connection string from the Neon dashboard already
includes ?sslmode=require – no extra config is needed here.
"""

import os
from dotenv import load_dotenv          # reads the .env file into os.environ
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment variables from the .env file in the same directory.
# load_dotenv() is safe to call even if .env is missing (it just does nothing).
load_dotenv()

# DATABASE_URL must be set to a PostgreSQL/Neon connection string, e.g.:
#   postgresql://user:password@ep-xyz.us-east-1.aws.neon.tech/dbname?sslmode=require
#
# The SQLite fallback is kept only for local development without a Neon account.
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./zombieware.db"          # fallback – not used when .env is set
)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # SQLite needs the check_same_thread=False flag because FastAPI uses
    # multiple threads and SQLite is not thread-safe by default.
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # PostgreSQL / Neon – no extra connect_args needed.
    # pool_pre_ping=True makes SQLAlchemy test the connection before using it,
    # which prevents "server closed the connection unexpectedly" errors that
    # can happen with Neon's serverless connection pooling.
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
    )

# Session factory – autocommit and autoflush are OFF so every request has
# explicit transaction control (db.commit() / db.rollback()).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base – all ORM models inherit from this.
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides one database session per request and
    guarantees the session is closed afterwards, even if an exception occurs.

    Usage in a route:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
