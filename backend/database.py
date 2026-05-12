import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# Use Replit's built-in PostgreSQL (DATABASE_URL), with NEON_DATABASE_URL as fallback
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("NEON_DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. "
        "Please ensure the Replit PostgreSQL database is provisioned."
    )

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    # Sized for ~33 concurrent players.  Each request holds a connection for
    # the duration of its DB work; with 10-second polling + WebSocket pushes,
    # sustained concurrency stays well below 20.  max_overflow absorbs bursts.
    pool_size=20,
    max_overflow=30,
    pool_timeout=10,           # fail fast rather than hang the event loop
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
