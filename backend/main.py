import asyncio
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine, SessionLocal
from sqlalchemy import text

from routes import auth, session, player, game
from websocket_manager import manager

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


def ensure_game_schema():
    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS game"))
            conn.commit()
        except Exception:
            conn.rollback()


def run_migrations():
    with engine.connect() as conn:
        # If the items table still uses the old schema (card code as PK, no 'code' column),
        # drop it so create_all() can recreate it with the new UUID PK + code column.
        try:
            conn.execute(text("SELECT code FROM game.items LIMIT 1"))
        except Exception:
            conn.rollback()
            try:
                conn.execute(text("DROP TABLE IF EXISTS game.items CASCADE"))
                conn.commit()
            except Exception:
                conn.rollback()

        new_cols = [
            ("game.group_players", "inventory",             "TEXT DEFAULT '[]'"),
            ("game.group_players", "objectives",            "TEXT DEFAULT '[]'"),
            ("game.group_players", "initial_cards_scanned", "INTEGER DEFAULT 0"),
            ("game.group_players", "has_skipped_trade",     "BOOLEAN DEFAULT FALSE"),
            ("game.group_players", "round_skip_used",       "BOOLEAN DEFAULT FALSE"),
            ("game.group_players", "is_initial_zombie",     "BOOLEAN DEFAULT FALSE"),
            ("game.group_players", "score",                 "INTEGER DEFAULT 0"),
            ("game.group_players", "infected_by_id",        "VARCHAR"),
            ("game.group_players", "infected_in_round",     "INTEGER"),
            ("game.group_players", "early_completion_awarded", "BOOLEAN DEFAULT FALSE NOT NULL"),
            ("game.groups",        "instruction_slide",     "INTEGER DEFAULT 0"),
            ("game.groups",        "scan_end_time",         "INTEGER"),
            ("game.groups",        "last_activity",         "INTEGER"),
            ("game.groups",        "scan_phase_complete",   "BOOLEAN DEFAULT FALSE NOT NULL"),
            ("game.sessions",      "note",                  "VARCHAR"),
        ]
        for table, col, definition in new_cols:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {definition}"))
                conn.commit()
            except Exception:
                conn.rollback()  # reset the aborted transaction so subsequent ALTERs work


def seed_cards():
    db = SessionLocal()
    try:
        count = db.query(models.Card).count()
        # Only skip if ALL known cards already have a non-unknown type.
        # If any card still has 'unknown' type, re-run the seeder to fix them.
        unknown_count = db.query(models.Card).filter(models.Card.card_type == 'unknown').count()
        # Also re-seed if any card still has the old 'hacking-tool' type (hyphen variant)
        hyphen_count = db.query(models.Card).filter(models.Card.card_type == 'hacking-tool').count()
        if count >= 54 and unknown_count == 0 and hyphen_count == 0:
            return

        CARDS_DATA = [
            # Firewall (11 cards)
            ("QRC-1Q7W9L3F", "firewall"), ("QRC-2J3K9W7P", "firewall"), ("QRC-2X8V3L7H", "firewall"),
            ("QRC-3N8P4R6K", "firewall"), ("QRC-4M9K1T5D", "firewall"), ("QRC-4R8N6L1Y", "firewall"),
            ("QRC-5Y2L7Q9X", "firewall"), ("QRC-6V4X2K8J", "firewall"), ("QRC-7P2N6Y8R", "firewall"),
            ("QRC-8B6T1V4M", "firewall"), ("QRC-9D1M5T7H", "firewall"),

            # Hacking Tool (11 cards)
            ("QRC-1R7V4K9H", "hacking_tool"), ("QRC-2K5W9R7D", "hacking_tool"), ("QRC-3X9N4B8F", "hacking_tool"),
            ("QRC-4T8M1L3P", "hacking_tool"), ("QRC-5J1T7K2P", "hacking_tool"), ("QRC-5M7Q2T8H", "hacking_tool"),
            ("QRC-5Q3T4K7D", "hacking_tool"), ("QRC-6Y3P8T1D", "hacking_tool"), ("QRC-7N2X6Q5J", "hacking_tool"),
            ("QRC-8V1P4Y6N", "hacking_tool"), ("QRC-9Q6L2M5W", "hacking_tool"),

            # Security Layer (10 cards)
            ("QRC-1V3M9R7K", "security_layer"), ("QRC-2W7M5Q3H", "security_layer"), ("QRC-3L1Y6K8P", "security_layer"),
            ("QRC-4P6X1N9J", "security_layer"), ("QRC-5R7B9M2W", "security_layer"), ("QRC-6N8Q5P1D", "security_layer"),
            ("QRC-7K2T8L4Y", "security_layer"), ("QRC-8D4R9V6L", "security_layer"), ("QRC-8T5Q4N1J", "security_layer"),
            ("QRC-9H4X7T2V", "security_layer"),

            # Security Patch (11 cards)
            ("QRC-1M8Z4K7Q", "security_patch"), ("QRC-2R7Y6F9K", "security_patch"), ("QRC-3P7K8V1D", "security_patch"),
            ("QRC-4X7P3N8V", "security_patch"), ("QRC-5H1V8N4P", "security_patch"), ("QRC-6N9X2L5B", "security_patch"),
            ("QRC-7D3L9W2X", "security_patch"), ("QRC-8F2K9L1M", "security_patch"), ("QRC-8J4Q1T3M", "security_patch"),
            ("QRC-9B6T2R5Y", "security_patch"), ("QRC-9W2M4R6H", "security_patch"),

            # System Boost (11 cards)
            ("QRC-1P9V4T3H", "system_boost"), ("QRC-1X5T7N8J", "system_boost"), ("QRC-2H6P9X4T", "system_boost"),
            ("QRC-3T8M2Y6P", "system_boost"), ("QRC-4L9B2Q6Y", "system_boost"), ("QRC-5Q7L3V9K", "system_boost"),
            ("QRC-6K2W8R5L", "system_boost"), ("QRC-7V3K1M8F", "system_boost"), ("QRC-7X5M2Q8D", "system_boost"),
            ("QRC-8R1D5N7W", "system_boost"), ("QRC-9N4F1X7J", "system_boost"),
        ]

        for code, card_type in CARDS_DATA:
            existing = db.query(models.Card).filter_by(code=code).first()
            if existing:
                existing.card_type = card_type
            else:
                db.add(models.Card(code=code, card_type=card_type))
        db.commit()
    finally:
        db.close()


INACTIVITY_TIMEOUT = 15 * 60  # 15 minutes in seconds
INACTIVITY_CHECK_INTERVAL = 60  # check every 60 seconds

async def auto_close_inactive_games():
    """Background task: close games inactive for more than 15 minutes."""
    await asyncio.sleep(30)  # let the server fully start first
    while True:
        try:
            db = SessionLocal()
            threshold = int(time.time()) - INACTIVITY_TIMEOUT
            active_states = ["lobby", "module_instructions", "initial_scan_phase",
                             "round_active", "module_between_rounds"]
            groups = (
                db.query(models.Group)
                  .filter(models.Group.game_state.in_(active_states))
                  .all()
            )
            for group in groups:
                activity = group.last_activity
                # Skip groups where last_activity is None — they were just created
                # and haven't had any player action yet.  Closing them immediately
                # would kill brand-new games before players even get a chance to start.
                if activity is None:
                    continue
                if activity < threshold:
                    print(f"[auto_close] Closing inactive game {group.id} (last_activity={activity})")
                    group.game_state = "end_game"
                    db.commit()
                    await manager.broadcast_to_group(group.id, {
                        "type": "GAME_ENDED",
                        "reason": "inactivity",
                    })
            db.close()
        except Exception as e:
            print(f"[auto_close] Error: {e}")
        await asyncio.sleep(INACTIVITY_CHECK_INTERVAL)


@app.on_event("startup")
async def startup():
    ensure_game_schema()
    models.Base.metadata.create_all(bind=engine)
    run_migrations()
    seed_cards()
    asyncio.create_task(auto_close_inactive_games())

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
