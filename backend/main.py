from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine, SessionLocal
from sqlalchemy import text

from routes import auth, session, player, game

# Create DB Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Zombieware API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 54 physical card QR codes ──────────────────────────────────────────────────
# Card types will be assigned once the physical cards arrive.
# Update each entry's second value (currently "unknown") when the mapping is known.
QRC_CATALOG = [
    # Group A (20 cards)
    ("QRC-8F2K9L1M", "unknown"), ("QRC-4X7P3N8V", "unknown"),
    ("QRC-9B6T2R5Y", "unknown"), ("QRC-1M8Z4K7Q", "unknown"),
    ("QRC-7D3L9W2X", "unknown"), ("QRC-5H1V8N4P", "unknown"),
    ("QRC-2R7Y6F9K", "unknown"), ("QRC-8J4Q1T3M", "unknown"),
    ("QRC-6N9X2L5B", "unknown"), ("QRC-3P7K8V1D", "unknown"),
    ("QRC-9W2M4R6H", "unknown"), ("QRC-1X5T7N8J", "unknown"),
    ("QRC-4L9B2Q6Y", "unknown"), ("QRC-7V3K1M8F", "unknown"),
    ("QRC-2H6P9X4T", "unknown"), ("QRC-8R1D5N7W", "unknown"),
    ("QRC-5Q7L3V9K", "unknown"), ("QRC-3T8M2Y6P", "unknown"),
    ("QRC-9N4F1X7J", "unknown"), ("QRC-6K2W8R5L", "unknown"),
    # Group B (20 cards)
    ("QRC-1P9V4T3H", "unknown"), ("QRC-7X5M2Q8D", "unknown"),
    ("QRC-4R8N6L1Y", "unknown"), ("QRC-2J3K9W7P", "unknown"),
    ("QRC-8B6T1V4M", "unknown"), ("QRC-5Y2L7Q9X", "unknown"),
    ("QRC-3N8P4R6K", "unknown"), ("QRC-9D1M5T7H", "unknown"),
    ("QRC-6V4X2K8J", "unknown"), ("QRC-1Q7W9L3F", "unknown"),
    ("QRC-7P2N6Y8R", "unknown"), ("QRC-4M9K1T5D", "unknown"),
    ("QRC-2X8V3L7H", "unknown"), ("QRC-8T5Q4N1J", "unknown"),
    ("QRC-5R7B9M2W", "unknown"), ("QRC-3L1Y6K8P", "unknown"),
    ("QRC-9H4X7T2V", "unknown"), ("QRC-6N8Q5P1D", "unknown"),
    ("QRC-1V3M9R7K", "unknown"), ("QRC-7K2T8L4Y", "unknown"),
    # Group C (14 cards)
    ("QRC-4P6X1N9J", "unknown"), ("QRC-2W7M5Q3H", "unknown"),
    ("QRC-8D4R9V6L", "unknown"), ("QRC-5J1T7K2P", "unknown"),
    ("QRC-3X9N4B8F", "unknown"), ("QRC-9Q6L2M5W", "unknown"),
    ("QRC-6Y3P8T1D", "unknown"), ("QRC-1R7V4K9H", "unknown"),
    ("QRC-7N2X6Q5J", "unknown"), ("QRC-4T8M1L3P", "unknown"),
    ("QRC-2K5W9R7D", "unknown"), ("QRC-8V1P4Y6N", "unknown"),
    ("QRC-5M7Q2T8H", "unknown"), ("QRC-5Q3T4K7D", "unknown"),
]


def run_migrations():
    with engine.connect() as conn:
        new_cols = [
            ("group_players", "inventory",             "TEXT DEFAULT '[]'"),
            ("group_players", "objectives",            "TEXT DEFAULT '[]'"),
            ("group_players", "initial_cards_scanned", "INTEGER DEFAULT 0"),
            ("groups",        "instruction_slide",     "INTEGER DEFAULT 0"),
        ]
        for table, col, definition in new_cols:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {definition}"))
                conn.commit()
            except Exception:
                pass  # column already exists


def seed_cards():
    db = SessionLocal()
    try:
        existing = {c.code: c for c in db.query(models.Card).all()}

        # Remove legacy ZW-* cards if they exist
        legacy = [c for code, c in existing.items() if code.startswith("ZW-")]
        if legacy:
            for card in legacy:
                db.delete(card)
            db.commit()
            existing = {code: c for code, c in existing.items() if not code.startswith("ZW-")}

        # Insert any QRC cards not yet in the DB
        added = 0
        for code, card_type in QRC_CATALOG:
            if code not in existing:
                db.add(models.Card(code=code, card_type=card_type))
                added += 1
        if added:
            db.commit()
    finally:
        db.close()


@app.on_event("startup")
async def startup():
    run_migrations()
    seed_cards()

app.include_router(auth.router)
app.include_router(session.router)
app.include_router(player.router)
app.include_router(game.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Zombieware API"}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="localhost", port=port)
