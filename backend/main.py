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

def run_migrations():
    with engine.connect() as conn:
        new_cols = [
            ("group_players", "inventory",             "TEXT DEFAULT '[]'"),
            ("group_players", "objectives",            "TEXT DEFAULT '[]'"),
            ("group_players", "initial_cards_scanned", "INTEGER DEFAULT 0"),
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
        count = db.query(models.Card).count()
        if count >= 54:
            return
        CARD_TYPES = [
            ("remedio",     11),
            ("comida",      11),
            ("arma",        11),
            ("roupa",       11),
            ("ferramentas", 10),
        ]
        PREFIX = {"remedio": "MED", "comida": "FOOD", "arma": "ARM", "roupa": "CLO", "ferramentas": "TOOL"}
        for card_type, qty in CARD_TYPES:
            for i in range(1, qty + 1):
                code = f"ZW-{PREFIX[card_type]}-{i:02d}"
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
    uvicorn.run("main:app", host="localhost", port=port)
