from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session as DBSession
from database import get_db
import models
from websocket_manager import manager
import random
import time
import json

router = APIRouter(prefix="/api/game", tags=["game"])

WORDS = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT",
         "CIPHER", "PROXY", "TOKEN", "VAULT", "SHIELD", "PATCH"]

ROUND_EVENTS = [
    {"id": "firewall_down", "title": "🔥 Firewall Down!", "desc": "All Firewalls lose their protection for 60 seconds."},
    {"id": "audit",         "title": "🔍 Security Audit", "desc": "All players must verify identity. Analysts reveal one player's status."},
    {"id": "patch",         "title": "⚡ Emergency Patch", "desc": "One random Zombie becomes cured for this round only."},
    {"id": "zero_trust",    "title": "🚫 Zero Trust Mode", "desc": "No item trades for 30 seconds. Trust no one."},
]

ALL_CARD_TYPES = ["remedio", "comida", "arma", "roupa", "ferramentas"]
TOTAL_SLIDES = 7  # slides 0–6 per module

# ── WebSocket ──────────────────────────────────────────────────────────────────
@router.websocket("/ws/{group_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, group_id: str, player_id: str):
    await manager.connect(websocket, group_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, group_id)


# ── Start Game ─────────────────────────────────────────────────────────────────
@router.post("/{group_id}/start")
async def start_game(group_id: str, payload: dict = {}, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    players = group.players
    if len(players) == 0:
        raise HTTPException(status_code=400, detail="Not enough players to start")

    mode = payload.get("game_mode", group.game_mode or "normal")
    group.game_mode = mode

    for p in players:
        p.role = "survivor"
        p.is_infected = False
        p.is_ready = False
        p.inventory = '[]'
        p.objectives = '[]'
        p.initial_cards_scanned = 0

    event = None

    if mode == "module_1":
        zombie_count = 0
        group.secret_word = None
    elif mode == "module_2":
        zombie_count = 1
        group.secret_word = None
    elif mode == "module_3":
        zombie_count = 1
        group.secret_word = random.choice(WORDS)
    else:
        # Normal mode
        group.secret_word = random.choice(WORDS)
        zombie_count = 1

    if zombie_count > 0:
        zombie_players = random.sample(
            [p for p in players if p.role == "survivor"], min(zombie_count, len(players))
        )
        for p in zombie_players:
            p.role = "zombie"
            p.is_infected = True

    group.game_state = "module_instructions"
    group.current_round = 0
    group.round_end_time = None
    group.instruction_slide = 0

    db.commit()

    await manager.broadcast_to_group(group_id, {
        "type": "GAME_STARTED",
        "state": group.game_state,
        "mode": mode,
    })

    return {"message": "Game started", "mode": mode}


# ── Slide advancement helper ───────────────────────────────────────────────────
async def _advance_slide(group, db, group_id: str):
    nxt = (group.instruction_slide or 0) + 1
    for p in group.players:
        p.is_ready = False
    if nxt >= TOTAL_SLIDES:
        group.game_state = "round_active"
        group.current_round = 1
        group.round_end_time = int(time.time()) + 180
        db.commit()
        await manager.broadcast_to_group(group_id, {"type": "ROUND_STARTED"})
    else:
        group.instruction_slide = nxt
        db.commit()
        await manager.broadcast_to_group(group_id, {"type": "SLIDE_ADVANCED", "slide": nxt})


# ── Synchronized slide ready ───────────────────────────────────────────────────
@router.post("/{group_id}/slide_ready")
async def slide_ready(group_id: str, payload: dict = {}, db: DBSession = Depends(get_db)):
    player_id = payload.get("player_id")
    player = db.query(models.GroupPlayer).filter_by(id=player_id, group_id=group_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    group = player.group
    if group.game_state != "module_instructions":
        raise HTTPException(status_code=400, detail="Not in instruction phase")

    if player.is_ready:
        ready = sum(1 for p in group.players if p.is_ready)
        return {"ready": ready, "total": len(group.players), "slide": group.instruction_slide or 0}

    player.is_ready = True
    db.commit()

    ready = sum(1 for p in group.players if p.is_ready)
    total = len(group.players)
    not_ready = [p.user.username for p in group.players if not p.is_ready]

    await manager.broadcast_to_group(group_id, {
        "type": "PLAYER_READY",
        "ready": ready,
        "total": total,
        "not_ready": not_ready,
    })

    if all(p.is_ready for p in group.players):
        await _advance_slide(group, db, group_id)

    return {"ready": ready, "total": total, "slide": group.instruction_slide or 0}


# ── Legacy: finish_instructions (kept for compatibility) ──────────────────────
@router.post("/{group_id}/finish_instructions")
async def finish_instructions(group_id: str, payload: dict = {}, db: DBSession = Depends(get_db)):
    return await slide_ready(group_id, payload, db)


# ── Initial Card Scan (4 cards per player) ────────────────────────────────────
@router.post("/{group_id}/initial_scan")
async def initial_scan(group_id: str, payload: dict, db: DBSession = Depends(get_db)):
    player_id = payload.get("player_id")
    card_code = payload.get("card_code", "").strip().upper()

    if not player_id or not card_code:
        raise HTTPException(status_code=400, detail="Missing player_id or card_code")

    player = db.query(models.GroupPlayer).filter_by(id=player_id, group_id=group_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    group = player.group
    if group.game_state not in ("initial_scan_phase", "module_instructions"):
        raise HTTPException(status_code=400, detail="Not in scan phase")

    # Look up card in master catalogue
    card = db.query(models.Card).filter_by(code=card_code).first()
    if not card:
        raise HTTPException(status_code=400, detail=f"Unknown card code: {card_code}. Valid format: QRC-XXXXXXXX")

    inventory = json.loads(player.inventory or '[]')

    # Prevent duplicate scan
    if any(c['code'] == card_code for c in inventory):
        return {"message": "already_scanned", "card_type": card.card_type,
                "initial_cards_scanned": player.initial_cards_scanned,
                "inventory": inventory, "objectives": json.loads(player.objectives or '[]')}

    if player.initial_cards_scanned >= 4:
        raise HTTPException(status_code=400, detail="Already scanned 4 cards")

    inventory.append({"code": card_code, "type": card.card_type, "contaminated": player.is_infected})
    player.inventory = json.dumps(inventory)
    player.initial_cards_scanned = (player.initial_cards_scanned or 0) + 1
    db.commit()

    objectives = json.loads(player.objectives or '[]')

    if player.initial_cards_scanned >= 4:
        # Assign 3 random objectives from card types in this game
        objectives = random.sample(ALL_CARD_TYPES, 3)
        player.objectives = json.dumps(objectives)
        player.is_ready = True
        db.commit()

        ready = sum(1 for p in group.players if p.is_ready)
        total = len(group.players)
        not_ready = [p.user.username for p in group.players if not p.is_ready]
        await manager.broadcast_to_group(group_id, {
            "type": "PLAYER_READY",
            "ready": ready,
            "total": total,
            "not_ready": not_ready,
        })

        # If all players finished initial scan → advance slide or start round
        if all(p.is_ready for p in group.players):
            if group.game_state == "module_instructions":
                await _advance_slide(group, db, group_id)
            else:
                # legacy initial_scan_phase
                group.game_state = "round_active"
                group.current_round = 1
                group.round_end_time = int(time.time()) + 180
                for p in group.players:
                    p.is_ready = False
                db.commit()
                await manager.broadcast_to_group(group_id, {"type": "ROUND_STARTED"})

    return {
        "card_type": card.card_type,
        "initial_cards_scanned": player.initial_cards_scanned,
        "inventory": inventory,
        "objectives": objectives,
    }


# ── Module between-rounds ──────────────────────────────────────────────────────
@router.post("/{group_id}/finish_round")
async def finish_round(group_id: str, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404)
    group.game_state = "module_between_rounds"
    for p in group.players:
        p.is_ready = False
    db.commit()
    await manager.broadcast_to_group(group_id, {"type": "ROUND_ENDED"})
    return {"message": "success"}


@router.post("/{group_id}/next_round")
async def next_round(group_id: str, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404)

    group.current_round += 1
    for p in group.players:
        p.is_ready = False

    if group.current_round > 3:
        group.game_state = "end_game"
        db.commit()
        await manager.broadcast_to_group(group_id, {"type": "GAME_ENDED"})
    else:
        group.game_state = "round_active"
        group.round_end_time = int(time.time()) + 180
        db.commit()
        await manager.broadcast_to_group(group_id, {"type": "ROUND_STARTED"})

    return {"message": "success"}


@router.post("/{group_id}/trade_done")
async def trade_done(group_id: str, payload: dict, db: DBSession = Depends(get_db)):
    player_id = payload.get("player_id")
    player = db.query(models.GroupPlayer).filter_by(id=player_id).first()
    if not player:
        raise HTTPException(status_code=404)

    player.is_ready = True
    db.commit()

    group = player.group
    if all(p.is_ready for p in group.players):
        group.game_state = "module_between_rounds"
        for p in group.players:
            p.is_ready = False
        db.commit()
        await manager.broadcast_to_group(group_id, {"type": "ROUND_ENDED"})
    else:
        await manager.broadcast_to_group(group_id, {"type": "PLAYER_READY"})

    return {"message": "success"}


@router.post("/{group_id}/skip_trade")
async def skip_trade(group_id: str, payload: dict, db: DBSession = Depends(get_db)):
    player_id = payload.get("player_id")
    player = db.query(models.GroupPlayer).filter_by(id=player_id).first()
    if not player:
        raise HTTPException(status_code=404)

    if player.has_skipped_trade:
        raise HTTPException(status_code=400, detail="Skip trade already used.")

    player.has_skipped_trade = True
    player.is_ready = True
    db.commit()

    group = player.group
    if all(p.is_ready for p in group.players):
        group.game_state = "module_between_rounds"
        for p in group.players:
            p.is_ready = False
        db.commit()
        await manager.broadcast_to_group(group_id, {"type": "ROUND_ENDED"})
    else:
        await manager.broadcast_to_group(group_id, {"type": "PLAYER_READY"})

    return {"message": "success"}


# ── Scan Item (end-of-round) ────────────────────────────────────────────────────
@router.post("/{group_id}/scan")
async def scan_item(group_id: str, payload: dict, db: DBSession = Depends(get_db)):
    player_id = payload.get("player_id")
    item_data  = payload.get("item")

    if not player_id or not item_data or not item_data.get("id"):
        raise HTTPException(status_code=400, detail="Invalid payload")

    player = db.query(models.GroupPlayer).filter(
        models.GroupPlayer.id == player_id,
        models.GroupPlayer.group_id == group_id
    ).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    group = player.group
    mode  = group.game_mode or "normal"

    item_id = item_data["id"]
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    edu_context = None

    if not item:
        item = models.Item(
            id=item_id,
            type=item_data.get("type", "unknown"),
            group_id=group_id,
            current_owner_id=player.id,
            previous_owner_id=None,
        )
        db.add(item)
        # Add to player inventory
        inventory = json.loads(player.inventory or '[]')
        inventory.append({"code": item_id, "type": item_data.get("type", "unknown"),
                          "contaminated": player.is_infected})
        player.inventory = json.dumps(inventory)
        edu_context = {
            "title": "📦 Item Acquired",
            "body": "You picked up a new item. In cybersecurity, this is like downloading a file — always verify the source!",
            "tag": "phishing_awareness",
        }
    else:
        if item.current_owner_id != player.id:
            item.previous_owner_id = item.current_owner_id
            item.current_owner_id  = player.id

            prev_owner = None
            if item.previous_owner_id:
                prev_owner = db.query(models.GroupPlayer).filter(
                    models.GroupPlayer.id == item.previous_owner_id
                ).first()

            newly_infected = False

            if mode != "module_1":
                if prev_owner and prev_owner.is_infected and not player.is_infected:
                    player.is_infected = True
                    player.role = "zombie"
                    newly_infected = True
                    # Mark card as contaminated in inventory
                    inventory = json.loads(player.inventory or '[]')
                    inventory.append({"code": item_id, "type": item.type, "contaminated": True})
                    player.inventory = json.dumps(inventory)
                    edu_context = {
                        "title": "🦠 Malware Transferred!",
                        "body": "You received a file from an infected source. This is how malware spreads — always verify who you receive files from (Zero Trust).",
                        "tag": "malware_spread",
                    }
                    await manager.broadcast_to_group(group_id, {
                        "type": "PLAYER_INFECTED",
                        "player_id": player.id,
                    })
                else:
                    inventory = json.loads(player.inventory or '[]')
                    inventory.append({"code": item_id, "type": item.type, "contaminated": False})
                    player.inventory = json.dumps(inventory)
            else:
                inventory = json.loads(player.inventory or '[]')
                inventory.append({"code": item_id, "type": item.type, "contaminated": False})
                player.inventory = json.dumps(inventory)
                edu_context = {
                    "title": "✅ Item Received",
                    "body": "Item logged. In real networks, receiving files triggers integrity checks to ensure the file wasn't tampered with.",
                    "tag": "integrity_check",
                }

    db.commit()

    return {
        "message": "Scan processed",
        "infected": player.is_infected,
        "edu": edu_context,
        "inventory": json.loads(player.inventory or '[]'),
    }


# ── Game State ─────────────────────────────────────────────────────────────────
@router.get("/{group_id}/state")
async def get_game_state(group_id: str, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    players_data = [{
        "id": p.id,
        "user_id": p.user_id,
        "username": p.user.username,
        "role": p.role,
        "is_infected": p.is_infected,
        "is_ready": getattr(p, "is_ready", False),
        "inventory": json.loads(p.inventory or '[]'),
        "objectives": json.loads(p.objectives or '[]'),
        "initial_cards_scanned": p.initial_cards_scanned or 0,
        "has_skipped_trade": p.has_skipped_trade or False,
    } for p in group.players]

    ready_count = sum(1 for p in group.players if p.is_ready)
    not_ready = [p.user.username for p in group.players if not p.is_ready]

    return {
        "game_state":       group.game_state,
        "current_round":    group.current_round,
        "round_end_time":   group.round_end_time,
        "scan_end_time":    group.scan_end_time,
        "secret_word":      group.secret_word,
        "game_mode":        group.game_mode,
        "instruction_slide": group.instruction_slide or 0,
        "ready_count":      ready_count,
        "not_ready":        not_ready,
        "players":          players_data,
    }


@router.post("/{group_id}/ready")
async def toggle_ready(group_id: str, payload: dict, db: DBSession = Depends(get_db)):
    player_id = payload.get("player_id")
    if not player_id:
        raise HTTPException(status_code=400, detail="Missing player_id")

    player = db.query(models.GroupPlayer).filter(
        models.GroupPlayer.id == player_id,
        models.GroupPlayer.group_id == group_id
    ).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    player.is_ready = True
    db.commit()

    await manager.broadcast_to_group(group_id, {
        "type": "PLAYER_READY",
        "player_id": player_id
    })

    group = player.group
    if len(group.players) > 0 and all(p.is_ready for p in group.players):
        if group.game_state == "lobby":
            await start_game(group_id, {}, db)

    return {"message": "Player ready"}


@router.post("/{group_id}/end")
async def end_game_manual(group_id: str, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    group.game_state = "end_game"
    db.commit()

    await manager.broadcast_to_group(group_id, {"type": "GAME_ENDED"})
    return {"message": "Game ended manually"}


# ── End-Game Recap ─────────────────────────────────────────────────────────────
@router.get("/{group_id}/recap")
async def get_recap(group_id: str, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    total   = len(group.players)
    zombies = [p for p in group.players if p.is_infected]
    surv    = [p for p in group.players if not p.is_infected]
    infection_rate = round(len(zombies) / total * 100) if total else 0

    lessons = [
        {"icon": "🔑", "concept": "Authentication",  "lesson": "Passwords are like secret words — only share them with verified parties."},
        {"icon": "🦠", "concept": "Malware Spread",  "lesson": "Infection spread through item scanning mirrors how malware propagates via file sharing."},
        {"icon": "🚫", "concept": "Zero Trust",       "lesson": "Never trust automatically — always verify before accepting items (files/data)."},
    ]

    return {
        "total_players":  total,
        "survivors":      len(surv),
        "zombies":        len(zombies),
        "infection_rate": infection_rate,
        "game_mode":      group.game_mode,
        "rounds_played":  group.current_round,
        "lessons":        lessons,
        "zombie_names":   [p.user.username for p in zombies],
        "survivor_names": [p.user.username for p in surv],
    }
