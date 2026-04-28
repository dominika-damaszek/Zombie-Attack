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
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Note: In strict production environments, replace ["*"] with the specific frontend URL.

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
