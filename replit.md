# Zombieware

A multiplayer classroom trading card game platform that teaches cybersecurity concepts (malware, authentication, zero-trust) through physical card trading and a digital backend.

## Run & Operate

- **Frontend**: `cd frontend && npm run dev` (port 5000)
- **Backend**: `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload` (port 8000)
- **Run button**: Starts both "Start application" (frontend) and "Backend API" (backend) workflows in parallel

Required env vars (auto-set by Replit DB): `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`  
Optional: `SECRET_KEY` (JWT signing; defaults to a dev placeholder — set in production)

## Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS 4, React Router 7, html5-qrcode, qrcode.react, Lucide React
- **Backend**: FastAPI (Python 3.12), Uvicorn, SQLAlchemy 2, Pydantic
- **Auth**: Custom JWT (python-jose) + Fernet encryption (cryptography) for teacher PINs
- **Database**: Replit PostgreSQL (dev) — uses the `game` schema for all tables
- **Real-time**: WebSockets via FastAPI + custom `websocket_manager.py`

## Where things live

- `frontend/src/pages/` — main views (Home, Auth, Dashboard, GameScreen, etc.)
- `frontend/src/hooks/useGameWebSocket.js` — real-time game state hook
- `frontend/src/services/` — API config and WS connection management
- `backend/main.py` — app entry point; runs migrations and seeds cards on startup
- `backend/models.py` — SQLAlchemy ORM (all in `game` schema)
- `backend/routes/` — auth, session, player, game endpoints
- `backend/websocket_manager.py` — WebSocket broadcast logic
- `frontend/vite.config.js` — proxy config routing `/auth`, `/session`, `/player`, `/api` to backend

## Architecture decisions

- All DB tables live in the `game` PostgreSQL schema — must be created manually (`CREATE SCHEMA IF NOT EXISTS game`) before first run
- Frontend proxies API calls through Vite dev server; no CORS issues in development
- Backend falls back to SQLite if `DATABASE_URL` is unset (local dev only)
- JWT tokens stored in localStorage; teacher PIN stored encrypted with Fernet (not bcrypt)
- Cards seeded from a 54-card catalog on startup; migration adds new columns safely via try/except

## Product

- Teachers register, log in, and host classroom sessions with configurable groups and game modes
- Students join via a QR code or group join code
- Gameplay flows: Lobby → Instructions → Initial Card Scan (4 physical cards) → Trading Rounds → End Game Recap
- Modules toggle mechanics: zombie infection, password authentication, zero-trust scoring
- Real-time game state synced via WebSockets
- **Individual scoring**: 🤝 Trade +1 (immediate), ☣️ Infect +3 (immediate to infector), 🛡️ Survive round +2, 🎯 Per objective met +1, 🏆 All objectives +2 bonus, 🌟 Final survivor +5
- **End-game leaderboard**: ranked podium (top 3) + full individual ranked list with stat pills (trades, infections, objectives) + scoring key; served from `/endgame` via `/api/game/{id}/recap`

## User preferences

_Populate as you build_

## Gotchas

- The `game` schema must exist in PostgreSQL before the backend can start — run `CREATE SCHEMA IF NOT EXISTS game;` once
- Backend workflow must use `python -m uvicorn` (not bare `uvicorn`) due to PATH in Replit's Nix environment
- `SECRET_KEY` env var defaults to a hardcoded dev value — always set a real secret in production

## Pointers

- DB schema: `backend/models.py`
- API routes: `backend/routes/`
- WS protocol: `backend/websocket_manager.py`
- Vite proxy: `frontend/vite.config.js`
