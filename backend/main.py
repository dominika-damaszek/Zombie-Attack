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
            ("game.group_players", "inventory",             "TEXT DEFAULT '[]'"),
            ("game.group_players", "objectives",            "TEXT DEFAULT '[]'"),
            ("game.group_players", "initial_cards_scanned", "INTEGER DEFAULT 0"),
            ("game.group_players", "has_skipped_trade",     "BOOLEAN DEFAULT FALSE"),
            ("game.group_players", "is_initial_zombie",     "BOOLEAN DEFAULT FALSE"),
            ("game.group_players", "score",                 "INTEGER DEFAULT 0 NOT NULL"),
            ("game.group_players", "infected_by_id",        "VARCHAR"),
            ("game.group_players", "infected_in_round",     "INTEGER"),
            ("game.groups",        "instruction_slide",     "INTEGER DEFAULT 0"),
            ("game.groups",        "scan_end_time",         "INTEGER"),
            ("game.items",         "is_contaminated",       "BOOLEAN DEFAULT FALSE"),
        ]
        for table, col, definition in new_cols:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {definition}"))
                conn.commit()
            except Exception:
                conn.rollback()  # reset the aborted transaction so subsequent ALTERs work


def seed_cards():
    db = SessionLocal()
    try:
        count = db.query(models.Card).count()
        if count >= 54:
            return
        
        CARDS_DATA = [
            # Medicine / Remedio (11 cards)
            ("QRC-8F2K9L1M", "remedio"), ("QRC-4X7P3N8V", "remedio"), ("QRC-9B6T2R5Y", "remedio"),
            ("QRC-1M8Z4K7Q", "remedio"), ("QRC-7D3L9W2X", "remedio"), ("QRC-5H1V8N4P", "remedio"),
            ("QRC-2R7Y6F9K", "remedio"), ("QRC-8J4Q1T3M", "remedio"), ("QRC-6N9X2L5B", "remedio"),
            ("QRC-3P7K8V1D", "remedio"), ("QRC-9W2M4R6H", "remedio"),

            # Food / Comida (11 cards)
            ("QRC-1X5T7N8J", "comida"), ("QRC-4L9B2Q6Y", "comida"), ("QRC-7V3K1M8F", "comida"),
            ("QRC-2H6P9X4T", "comida"), ("QRC-8R1D5N7W", "comida"), ("QRC-5Q7L3V9K", "comida"),
            ("QRC-3T8M2Y6P", "comida"), ("QRC-9N4F1X7J", "comida"), ("QRC-6K2W8R5L", "comida"),
            ("QRC-1P9V4T3H", "comida"), ("QRC-7X5M2Q8D", "comida"),

            # Weapon / Arma (11 cards)
            ("QRC-4R8N6L1Y", "arma"), ("QRC-2J3K9W7P", "arma"), ("QRC-8B6T1V4M", "arma"),
            ("QRC-5Y2L7Q9X", "arma"), ("QRC-3N8P4R6K", "arma"), ("QRC-9D1M5T7H", "arma"),
            ("QRC-6V4X2K8J", "arma"), ("QRC-1Q7W9L3F", "arma"), ("QRC-7P2N6Y8R", "arma"),
            ("QRC-4M9K1T5D", "arma"), ("QRC-2X8V3L7H", "arma"),

            # Clothing / Roupa (11 cards)
            ("QRC-8T5Q4N1J", "roupa"), ("QRC-5R7B9M2W", "roupa"), ("QRC-3L1Y6K8P", "roupa"),
            ("QRC-9H4X7T2V", "roupa"), ("QRC-6N8Q5P1D", "roupa"), ("QRC-1V3M9R7K", "roupa"),
            ("QRC-7K2T8L4Y", "roupa"), ("QRC-4P6X1N9J", "roupa"), ("QRC-2W7M5Q3H", "roupa"),
            ("QRC-8D4R9V6L", "roupa"), ("QRC-5J1T7K2P", "roupa"),

            # Tools / Ferramentas (10 cards)
            ("QRC-3X9N4B8F", "ferramentas"), ("QRC-9Q6L2M5W", "ferramentas"), ("QRC-6Y3P8T1D", "ferramentas"),
            ("QRC-1R7V4K9H", "ferramentas"), ("QRC-7N2X6Q5J", "ferramentas"), ("QRC-4T8M1L3P", "ferramentas"),
            ("QRC-2K5W9R7D", "ferramentas"), ("QRC-8V1P4Y6N", "ferramentas"), ("QRC-5M7Q2T8H", "ferramentas"),
            ("QRC-5Q3T4K7D", "ferramentas")
        ]

        for code, card_type in CARDS_DATA:
            if not db.query(models.Card).filter_by(code=code).first():
                db.add(models.Card(code=code, card_type=card_type))
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
    uvicorn.run("main:app", host="0.0.0.0", port=port)
