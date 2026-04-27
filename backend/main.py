from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine

from routes import auth, session, player, game

# Create DB Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Zombieware API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(session.router)
app.include_router(player.router)
app.include_router(game.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Zombieware API"}
