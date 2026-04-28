# Zombieware

A multiplayer classroom trading card game platform. Teachers host sessions; students join via QR code and simulate cybersecurity concepts (malware, authentication, zero-trust) through physical card trading.

## Architecture

- **Frontend**: React 19 + Vite on port 5000 (`cd frontend && npm run dev`)
- **Backend**: FastAPI + SQLAlchemy on port 8000 (`cd backend && uvicorn main:app --host localhost --port 8000 --reload`)
- **Database**: PostgreSQL (via `DATABASE_URL` env var) or SQLite fallback (`zombieware.db`)

## Game Flow

1. Teacher creates session (Module 1/2/3 or Normal game)
2. Students join lobby via QR/code → auto-split into groups of 6–11
3. Teacher starts game → roles assigned (survivor/zombie)
4. **Instruction phase**: 6 fullscreen slides (Space/arrow nav) — all players press "I'm Ready!"
5. **Initial scan phase**: each player scans their 4 physical starting cards
6. **Round active** (3 rounds × 3 min): physical card trading
7. **Between rounds**: players scan cards received during trading
8. Game over → EndGame recap

## Game Modes

- **Module 1** — Trading only, no zombies (concept: data sharing)
- **Module 2** — Zombies introduced, no passwords (concept: malware)
- **Module 3** — Zombies + secret passwords (concept: authentication / Zero Trust)
- **Normal** — Full game with zombies + passwords

## Key Features

- Back button on every page (below top nav, not inside nav)
- HostGame: modules displayed side by side (grid 3-col)
- Single game mode button (no difficulty levels)
- 6-slide fullscreen instructions per module with keyboard nav
- Per-player "Ready" tracking for instructions → initial scan transition
- Card master table: 54 cards (💊 Medicine ×11, 🍎 Food ×11, 🔫 Weapon ×11, 👕 Clothing ×11, 🔧 Tools ×10)
- Player inventory (JSON) + 3 random objectives assigned after initial scan
- Zombie Network: zombies see other zombie names
- Info modal (?) explaining all cards, roles, mechanics
- `/preview` route: no-auth demo page showing all UI states

## Tech Stack

- **Frontend**: React 19, React Router 7, Tailwind CSS 4, Vite 8, qrcode.react, html5-qrcode, lucide-react
- **Backend**: FastAPI, SQLAlchemy, Pydantic, python-jose (JWT), passlib/bcrypt, uvicorn
- **Real-time**: WebSockets via custom ConnectionManager

## DB Schema (key tables)

- `users` — teachers (username + PIN hash)
- `sessions` — teacher's session (game_mode, status)
- `groups` — game rooms (join_code, game_state, current_round, secret_word)
- `group_players` — player state (role, is_infected, inventory JSON, objectives JSON, initial_cards_scanned)
- `items` — QR-scanned items with ownership chain
- `cards` — master catalogue of 54 physical cards (code, card_type)

## Project Structure

```
/frontend      - React app (port 5000)
  /src/pages   - Home, Auth, Dashboard, HostGame, JoinGame, WaitingRoom, GameScreen, EndGame, PreviewPage
  /src/components - TopNav, BackButton, AudioToggle, EduPopup
  /src/hooks   - useGameWebSocket.js, useAudio.js
  /src/services - api.js

/backend       - FastAPI app (port 8000)
  main.py      - App entry, startup migration + card seeding
  models.py    - SQLAlchemy models
  database.py  - DB connection
  /routes      - auth.py, session.py, player.py, game.py
  websocket_manager.py
```

## API Endpoints (game)

- `POST /api/game/{id}/start` — start game, assign roles
- `POST /api/game/{id}/finish_instructions` — mark player ready (all ready → initial_scan_phase)
- `POST /api/game/{id}/initial_scan` — scan one of 4 starting cards (4th → assign objectives)
- `POST /api/game/{id}/scan` — end-of-round card scan
- `POST /api/game/{id}/trade_done` — player finished trading
- `POST /api/game/{id}/skip_trade` — use skip round (1×)
- `POST /api/game/{id}/next_round` — advance to next round
- `GET  /api/game/{id}/state` — full game state (incl. inventory, objectives)
- `GET  /api/game/{id}/recap` — end-game results

## Startup Migrations

`main.py` safely adds new columns via `ALTER TABLE IF NOT EXISTS` on startup and seeds the 54 card catalogue if not already present.
