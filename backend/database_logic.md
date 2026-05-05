# Database Logic – Migration to Neon PostgreSQL

This document describes every change made to move Zombieware from a local
SQLite file to a Neon-hosted PostgreSQL database, explains the reasoning
behind each decision, and shows exactly what needs to change in the existing
route code to support the new query requirements.

---

## 1. What Changed and Why

### 1.1 Environment Variables (`.env`)

**Old behaviour** — `database.py` fell back to a hard-coded SQLite URL
(`sqlite:///./zombieware.db`) and `auth.py` had `SECRET_KEY` hard-coded
in source.

**New behaviour** — both values are read from environment variables loaded
from `backend/.env` at startup.

```
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
SECRET_KEY=<random 32-byte hex string>
```

> **Why** — secrets must never be committed to git.  Neon provides a
> ready-made connection string from its dashboard; you just paste it into `.env`.

---

### 1.2 `database.py` – `python-dotenv` + `pool_pre_ping`

```python
# New: load .env before reading os.getenv(...)
from dotenv import load_dotenv
load_dotenv()

# New: pool_pre_ping tests the connection before handing it to a request.
# Neon's serverless tier can close idle connections; this prevents errors.
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
```

---

### 1.3 `neon_schema.sql` – Restructured Schema

The original schema had a bare-minimum structure.  The new schema adds the
columns and indexes needed for all analytics queries:

| Table | Key additions |
|---|---|
| `game.rooms` | `session_id`, `game_state`, `game_mode`, `created_at` |
| `game.players` | `role`, `is_infected`, `joined_at` |
| `game.item_types` | unchanged – seeded with 5 card categories |
| `game.items` | `item_code` (QR value), `room_id` (direct FK), `owner_id`, `is_contaminated`, `scanned_at` |

**Key design decision** – `game.items` stores both `room_id` AND `owner_id`
directly.  This means all analytics questions are answerable with simple
`GROUP BY` queries without chaining multiple JOINs:

```sql
-- How many players are in a room?
SELECT COUNT(*) FROM game.players WHERE room_id = $1;

-- Which players are in a room?
SELECT player_id, player_name, role, is_infected
FROM game.players WHERE room_id = $1;

-- How many cards are in play in a room?
SELECT COUNT(*) FROM game.items WHERE room_id = $1;

-- How many cards of each type are in a room?
SELECT it.item_type_name, COUNT(*) AS qty
FROM game.items i
JOIN game.item_types it USING (item_type_id)
WHERE i.room_id = $1
GROUP BY it.item_type_name;

-- How many cards of each type does a player have?
SELECT it.item_type_name, COUNT(*) AS qty
FROM game.items i
JOIN game.item_types it USING (item_type_id)
WHERE i.owner_id = $1
GROUP BY it.item_type_name;

-- Which exact cards does a player hold?
SELECT item_code, item_type_name, is_contaminated
FROM game.items i
JOIN game.item_types it USING (item_type_id)
WHERE i.owner_id = $1;
```

**Indexes** are created for every column used in WHERE / JOIN / GROUP BY to
keep these queries fast even with many concurrent rooms.

---

### 1.4 `db_queries.py` – Centralised Analytics Helpers

A new module with one function per query requirement.
All functions take a SQLAlchemy `Session` and return plain dicts.

| Function | What it returns |
|---|---|
| `get_room_player_count(db, group_id)` | `int` – total players in room |
| `get_room_players(db, group_id)` | `list[dict]` – each player + card count |
| `get_player_cards(db, player_id)` | `list[dict]` – every card the player holds |
| `get_room_cards_in_play(db, group_id)` | `int` – distinct cards scanned in room |
| `get_room_cards_by_type(db, group_id)` | `dict[type→count]` – per-type totals |
| `get_player_cards_by_type(db, player_id)` | `dict[type→count]` – per-type totals |
| `get_room_dashboard(db, group_id)` | All of the above in one dict |
| `assign_card_to_player(db, …)` | Core QR-scan logic (see §2.1) |

---

## 2. Route Code Changes Required

### 2.1 QR-Code Scan – `routes/game.py` → `POST /api/game/{group_id}/scan`

**Current problem** — the route manually creates/updates an `Item` row AND
updates a JSON string inside `GroupPlayer.inventory`.  Two places store the
same data, which can go out of sync.

**Required change** — replace the manual logic with a call to
`assign_card_to_player()` from `db_queries.py`.

At the top of `routes/game.py`, add the import:

```python
# Import the centralised QR-scan helper from db_queries
from db_queries import assign_card_to_player
```

Replace the entire body of `scan_item()` with:

```python
@router.post("/{group_id}/scan")
async def scan_item(group_id: str, payload: dict, db: DBSession = Depends(get_db)):
    player_id = payload.get("player_id")
    item_data  = payload.get("item")

    if not player_id or not item_data or not item_data.get("id"):
        raise HTTPException(status_code=400, detail="Invalid payload")

    card_code = item_data["id"].strip().upper()
    card_type  = item_data.get("type", "unknown")

    # assign_card_to_player() handles:
    #   • first-scan creation of the Item row
    #   • ownership transfer when an existing card is re-scanned
    #   • zombie infection if the previous owner was infected
    # It does NOT call db.commit() – we do that here so the whole
    # request can be rolled back as a unit if anything goes wrong.
    result = assign_card_to_player(db, group_id, player_id, card_code, card_type)
    db.commit()

    # Broadcast infection event over WebSocket so all group members update
    if result["newly_infected"]:
        await manager.broadcast_to_group(group_id, {
            "type":      "PLAYER_INFECTED",
            "player_id": player_id,
        })

    return {
        "message":         "Scan processed",
        "card_code":       result["card_code"],
        "card_type":       result["card_type"],
        "infected":        result["newly_infected"],
        "is_contaminated": result["is_contaminated"],
    }
```

> **Note on inventory JSON** — the old `GroupPlayer.inventory` JSON field is
> no longer the source of truth.  The `items` table now owns that data.
> The field can be kept temporarily for backwards compatibility with older
> frontend builds, but it should be removed once all clients have updated.

---

### 2.2 Join Room – `routes/player.py` → `POST /player/join`

**Current behaviour** — when a player joins, a `GroupPlayer` row is created
in the `group_players` table.  This is already correct for the ORM layer.

**Required addition** — the `game.players` table in the Neon `game` schema
also needs a matching row so raw SQL analytics (Neon dashboard, external
tools) work correctly.

Inside `join_group()`, after the `GroupPlayer` insert block, add:

```python
from sqlalchemy import text  # add to imports at top of player.py

# ── Mirror the player into the game schema ────────────────────────────────────
# game.players is the Neon analytics table.  The ORM uses group_players.
# ON CONFLICT DO NOTHING is safe – we already checked for existing membership.
if not existing_membership:
    db.execute(text("""
        INSERT INTO game.players (player_id, player_name, room_id)
        VALUES (:pid, :name, :rid)
        ON CONFLICT (player_id) DO NOTHING
    """), {
        "pid":  membership.id,
        "name": user.username,
        "rid":  group.id,
    })
    # The commit that already exists in the route covers this insert too.
```

> **Long-term** — once the project is fully migrated, the SQLAlchemy models
> should be updated to use `__table_args__ = {"schema": "game"}` so the ORM
> and the Neon schema are the same tables, removing the need for this dual-write.

---

### 2.3 New Teacher Dashboard Endpoint

Add this to `routes/session.py` to expose all analytics in one API call:

```python
from db_queries import get_room_dashboard  # add to imports

@router.get("/{session_id}/dashboard")
def session_dashboard(
    session_id: str,
    token: str,
    db: Session = Depends(database.get_db),
):
    """
    Returns a full analytics snapshot for every room in a session.

    For each room the response includes:
      - Total player count
      - List of players (name, role, infection status, card count)
      - Total cards in play
      - Cards in play broken down by type
      - Per-player card breakdown by type
    """
    user    = get_current_user(token, db)
    session = db.query(models.Session).filter_by(
        id=session_id, teacher_id=user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    rooms = []
    for group in session.groups:
        if group.group_number == 0:
            continue  # skip the lobby staging group (group_number 0)
        rooms.append(get_room_dashboard(db, group.id))

    return {"session_id": session_id, "rooms": rooms}
```

---

## 3. Migration Steps (in order)

Follow these steps when switching to Neon:

**Step 1** — Get your connection string from the Neon dashboard:
`Project → Connection Details → copy connection string`

**Step 2** — Paste it into `backend/.env`:
```
DATABASE_URL=postgresql://...?sslmode=require
SECRET_KEY=<output of: python -c "import secrets; print(secrets.token_hex(32))">
```

**Step 3** — Run the schema on Neon: open the Neon SQL Editor, paste the
full contents of `neon_schema.sql`, and execute.  This creates all tables
and seeds the five item types.

**Step 4** — Install the new dependency:
```bash
pip install -r requirements.txt
```
(`python-dotenv` was added to `requirements.txt`)

**Step 5** — Start the backend.  SQLAlchemy's `Base.metadata.create_all()`
in `main.py` will create the ORM tables (in the `public` schema) on Neon
automatically.

**Step 6** — Apply the route changes from §2 when you are ready to fully
retire the JSON inventory field.

---

## 4. Data-Flow Summary

```
Player scans QR code
        │
        ▼
POST /api/game/{group_id}/scan
        │
        ├─ assign_card_to_player()          ← db_queries.py
        │       ├─ Look up Item by card_code
        │       ├─ If new  → INSERT into items (owner = this player)
        │       └─ If seen → UPDATE owner; check infection transfer
        │
        ├─ db.commit()
        └─ (if newly infected) broadcast PLAYER_INFECTED via WebSocket


Player enters join code
        │
        ▼
POST /player/join
        │
        ├─ Find Group by join_code
        ├─ INSERT GroupPlayer (ORM)          ← group_players table
        ├─ INSERT game.players (raw SQL)     ← game schema analytics table
        ├─ db.commit()
        └─ broadcast PLAYER_JOINED via WebSocket


Teacher opens dashboard
        │
        ▼
GET /session/{id}/dashboard
        │
        └─ get_room_dashboard() for each room   ← db_queries.py
                ├─ get_room_player_count()
                ├─ get_room_cards_in_play()
                ├─ get_room_cards_by_type()
                └─ per-player: get_player_cards_by_type()
```
