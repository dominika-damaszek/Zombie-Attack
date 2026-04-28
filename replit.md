# Zombieware

A multiplayer classroom game platform where players take on roles as Survivors or Zombies, interacting via QR codes in real-time sessions managed by a teacher/host.

## Architecture

- **Frontend**: React 19 + Vite on port 5000 (`cd frontend && npm run dev`)
- **Backend**: FastAPI + SQLAlchemy on port 8000 (`cd backend && uvicorn main:app --host localhost --port 8000 --reload`)
- **Database**: PostgreSQL (via `DATABASE_URL` env var) or SQLite fallback

## Tech Stack

- **Frontend**: React 19, React Router 7, Tailwind CSS 4, Vite 8, qrcode.react, html5-qrcode
- **Backend**: FastAPI, SQLAlchemy, Pydantic, python-jose (JWT), passlib/bcrypt, uvicorn
- **Real-time**: WebSockets via custom ConnectionManager

## Project Structure

```
/frontend      - React app (port 5000)
  /src/pages   - Home, Auth, Dashboard, HostGame, JoinGame, WaitingRoom, GameScreen
  /src/hooks   - useGameWebSocket.js
  /src/services - api.js (API_BASE_URL from VITE_API_URL env or http://127.0.0.1:8000)

/backend       - FastAPI app (port 8000)
  main.py      - Entry point
  models.py    - SQLAlchemy models
  database.py  - DB engine (DATABASE_URL env or sqlite)
  schemas.py   - Pydantic schemas
  /routes      - auth.py, session.py, player.py, game.py
  websocket_manager.py - WebSocket connection manager
```

## Workflows

- **Start application**: `cd frontend && npm run dev` (webview, port 5000)
- **Backend API**: `cd backend && uvicorn main:app --host localhost --port 8000 --reload` (console, port 8000)

## Deployment

Configured for autoscale deployment running `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000`.

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (defaults to SQLite if not set)
- `VITE_API_URL`: Backend API URL for frontend (defaults to `http://127.0.0.1:8000`)
- `SECRET_KEY`: JWT secret key for auth
