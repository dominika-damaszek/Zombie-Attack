from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session as DBSession
from database import get_db
import models
from websocket_manager import manager
import random
import time
import json
import db_queries

router = APIRouter(prefix="/api/game", tags=["game"])


def _touch(group):
    """Update last_activity timestamp on the group (call before db.commit)."""
    group.last_activity = int(time.time())


# ── List all physical cards (used by bots / admin) ────────────────────────────
@router.get("/cards")
async def list_cards(db: DBSession = Depends(get_db)):
    cards = db.query(models.Card).all()
    return [{"code": c.code, "type": c.card_type} for c in cards]

WORDS = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT",
         "CIPHER", "PROXY", "TOKEN", "VAULT", "SHIELD", "PATCH"]

ROUND_EVENTS = [
    {"id": "firewall_down", "title": "🔥 Firewall Down!", "desc": "All Firewalls lose their protection for 60 seconds."},
    {"id": "audit",         "title": "🔍 Security Audit", "desc": "All players must verify identity. Analysts reveal one player's status."},
    {"id": "patch",         "title": "⚡ Emergency Patch", "desc": "One random Zombie becomes cured for this round only."},
    {"id": "zero_trust",    "title": "🚫 Zero Trust Mode", "desc": "No item trades for 30 seconds. Trust no one."},
]

ALL_CARD_TYPES = ["security_patch", "system_boost", "hacking_tool", "firewall", "security_layer"]
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

    # Clean up any items from a previous game in this group
    db.query(models.Item).filter(models.Item.group_id == group_id).delete()

    for p in players:
        p.role = "survivor"
        p.is_infected = False
        p.is_initial_zombie = False
        p.is_ready = False
        p.inventory = '[]'
        p.objectives = '[]'
        p.initial_cards_scanned = 0
        p.score = 0
        p.infected_by_id = None
        p.infected_in_round = None

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
            p.is_initial_zombie = True  # permanent record of original assignment

    group.game_state = "module_instructions"
    group.current_round = 0
    group.round_end_time = None
    group.instruction_slide = 0
    _touch(group)

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
    _touch(group)
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

    # Check if card is already claimed by another player in the same group
    existing_item = db.query(models.Item).filter(models.Item.id == card_code).first()
    if existing_item and existing_item.current_owner_id and existing_item.current_owner_id != player.id:
        owner = db.query(models.GroupPlayer).filter_by(id=existing_item.current_owner_id).first()
        raise HTTPException(
            status_code=409,
            detail=f"already_owned_by:{owner.user.username if owner else 'someone'}"
        )

    # Check if player already scanned this card
    if existing_item and existing_item.current_owner_id == player.id:
        pass # Idempotent, already scanned
    else:
        if player.initial_cards_scanned >= 4:
            raise HTTPException(status_code=400, detail="Already scanned 4 cards")

        try:
            db_queries.assign_card_to_player(db, group_id, player.id, card_code)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Tag the card as contaminated if this player is already infected
        if player.is_infected:
            new_item = db.query(models.Item).filter_by(id=card_code).first()
            if new_item:
                new_item.is_contaminated = True

        player.initial_cards_scanned = (player.initial_cards_scanned or 0) + 1
        db.commit()

    # Re-fetch inventory directly from DB items table
    inventory_items = db.query(models.Item).filter_by(current_owner_id=player.id).all()
    inventory = [{"code": i.id, "type": i.type, "contaminated": i.is_contaminated} for i in inventory_items]

    objectives = json.loads(player.objectives or '[]')

    if player.initial_cards_scanned >= 4 and not objectives:
        # ── Distribute Objectives ─────────────────────────────────────────────
        # Rule: 3 objectives. Preferably 0 from cards the player already has, max 1.
        # Prefer types that are currently in play in the room.

        player_types = list(set(i.type for i in inventory_items))
        room_cards = db_queries.get_room_cards_by_type(db, group_id)
        room_types = list(room_cards.keys())

        # Types player does NOT have
        not_owned_in_room = [t for t in room_types if t not in player_types]
        all_not_owned = [t for t in ALL_CARD_TYPES if t not in player_types]

        pool_not_owned = not_owned_in_room.copy()
        for t in all_not_owned:
            if t not in pool_not_owned:
                pool_not_owned.append(t)

        random.shuffle(pool_not_owned)
        random.shuffle(player_types)

        # Take as many as possible from not_owned (up to 3)
        objectives = pool_not_owned[:3]
        
        # If we couldn't get 3 (e.g. player holds 3 or 4 types), we must take from player_types
        needed = 3 - len(objectives)
        if needed > 0:
            objectives.extend(player_types[:needed])

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

    is_final = (group.current_round or 0) >= 3
    score_results = db_queries.award_round_points(db, group_id, is_final_round=is_final)

    group.game_state = "module_between_rounds"
    _touch(group)
    for p in group.players:
        p.is_ready = False
    db.commit()
    await manager.broadcast_to_group(group_id, {
        "type": "ROUND_ENDED",
        "scores": score_results,
    })
    return {"message": "success", "scores": score_results}


@router.post("/{group_id}/next_round")
async def next_round(group_id: str, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404)

    # Idempotent: only advance if we are actually between rounds.
    # Multiple bots/players may call this simultaneously; only the first call acts.
    if group.game_state != "module_between_rounds":
        return {"message": "already_advanced"}

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
        _touch(group)
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
    _touch(player.group)
    db.commit()

    group = player.group
    if all(p.is_ready for p in group.players):
        is_final = (group.current_round or 0) >= 3
        score_results = db_queries.award_round_points(db, group_id, is_final_round=is_final)
        group.game_state = "module_between_rounds"
        for p in group.players:
            p.is_ready = False
        db.commit()
        await manager.broadcast_to_group(group_id, {
            "type": "ROUND_ENDED",
            "scores": score_results,
        })
        return {"message": "success", "scores": score_results}
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
        is_final = (group.current_round or 0) >= 3
        score_results = db_queries.award_round_points(db, group_id, is_final_round=is_final)
        group.game_state = "module_between_rounds"
        for p in group.players:
            p.is_ready = False
        db.commit()
        await manager.broadcast_to_group(group_id, {
            "type": "ROUND_ENDED",
            "scores": score_results,
        })
        return {"message": "success", "scores": score_results}
    else:
        await manager.broadcast_to_group(group_id, {"type": "PLAYER_READY"})

    return {"message": "success"}


# ── Scan Item (trade / round scan) ─────────────────────────────────────────────
@router.post("/{group_id}/scan")
async def scan_item(group_id: str, payload: dict, db: DBSession = Depends(get_db)):
    player_id = payload.get("player_id")
    raw_item  = payload.get("item")
    card_code = payload.get("card_code") or (
        raw_item.get("id") if isinstance(raw_item, dict) else raw_item
    )

    if not player_id or not card_code:
        raise HTTPException(status_code=400, detail="Missing player_id or card_code")

    card_code = card_code.strip().upper()

    player = db.query(models.GroupPlayer).filter(
        models.GroupPlayer.id == player_id,
        models.GroupPlayer.group_id == group_id,
    ).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    group = player.group
    mode  = group.game_mode or "normal"
    zombies_enabled = (mode != "module_1")

    # ── 1. Validate the QR code against the master catalogue ──────────────────
    catalogue_card = db.query(models.Card).filter_by(code=card_code).first()
    if not catalogue_card:
        raise HTTPException(status_code=400, detail=f"Unknown card code: {card_code}")

    # ── 2. Look up the live item row (scoped to THIS group) ─────────────────
    item = db.query(models.Item).filter_by(id=card_code, group_id=group_id).first()
    edu_context = None
    newly_infected = False

    if not item:
        # Card has never been scanned in this group before — create it.
        # Delete any stale item from a previous game (same PK, different group).
        db.query(models.Item).filter(models.Item.id == card_code).delete()
        db.flush()
        item = models.Item(
            id=card_code,
            type=catalogue_card.card_type,
            group_id=group_id,
            current_owner_id=player.id,
            previous_owner_id=None,
            is_contaminated=player.is_infected,
        )
        db.add(item)
        edu_context = {
            "title": "📦 Item Acquired",
            "body": "You picked up a new item. In cybersecurity, this is like downloading a file — always verify the source!",
            "tag": "phishing_awareness",
        }

    elif item.current_owner_id == player.id:
        # Idempotent – player already owns this card, nothing to do
        pass

    else:
        # ── 3. TRADE: Card belongs to someone else → reassign ─────────────────
        prev_owner_id_before_trade = item.current_owner_id
        item.previous_owner_id = item.current_owner_id
        item.current_owner_id  = player.id

        # Auto-ready the player upon completing a trade
        player.is_ready = True

        # ── Trading point: +1 for completing a trade ───────────────────────────
        player.score = (player.score or 0) + 1

        # ── 4. INFECTION CHECK (only in modes with zombies) ───────────────────
        if zombies_enabled:
            if item.is_contaminated and not player.is_infected:
                # Receiving a contaminated card infects the player
                player.is_infected = True
                player.role = "zombie"
                newly_infected = True

                # Record who infected them (the previous card owner)
                prev_owner = db.query(models.GroupPlayer).filter_by(
                    id=item.previous_owner_id
                ).first() if item.previous_owner_id else None
                if prev_owner and prev_owner.is_infected:
                    player.infected_by_id = prev_owner.id
                    player.infected_in_round = group.current_round
                    # ── Infection point: +3 to the infector immediately ────────
                    prev_owner.score = (prev_owner.score or 0) + 3

                # Mark ALL cards the player currently holds as contaminated
                owned_items = db.query(models.Item).filter_by(
                    current_owner_id=player.id
                ).all()
                for owned in owned_items:
                    owned.is_contaminated = True

                edu_context = {
                    "title": "🦠 Malware Transferred!",
                    "body": "You received a file from an infected source. This is how malware spreads — always verify who you receive files from (Zero Trust).",
                    "tag": "malware_spread",
                }
                await manager.broadcast_to_group(group_id, {
                    "type": "PLAYER_INFECTED",
                    "player_id": player.id,
                    "username": player.user.username,
                })

            elif player.is_infected:
                # Player receiving card is already infected → card becomes contaminated
                item.is_contaminated = True

        else:
            # module_1: no infection, just log the trade
            edu_context = {
                "title": "✅ Item Received",
                "body": "Item logged. In real networks, receiving files triggers integrity checks to ensure the file wasn't tampered with.",
                "tag": "integrity_check",
            }

    _touch(group)
    db.commit()

    # ── Check if this auto-ready triggers the end of the round ────────────────
    round_ended = False
    scores = None
    if all(p.is_ready for p in group.players):
        is_final = (group.current_round or 0) >= 3
        scores = db_queries.award_round_points(db, group_id, is_final_round=is_final)
        group.game_state = "module_between_rounds"
        for p in group.players:
            p.is_ready = False
        db.commit()
        
        # We need to broadcast asynchronously, but we are inside an async function
        await manager.broadcast_to_group(group_id, {
            "type": "ROUND_ENDED",
            "scores": scores,
        })
        round_ended = True
    elif player.is_ready:
        await manager.broadcast_to_group(group_id, {
            "type": "PLAYER_READY",
        })

    # ── 5. Build inventory from DB (no JSON blob) ─────────────────────────────
    inventory = [
        {"code": i.id, "type": i.type, "contaminated": i.is_contaminated}
        for i in db.query(models.Item).filter_by(current_owner_id=player.id).all()
    ]

    return {
        "message": "Scan processed",
        "infected": player.is_infected,
        "newly_infected": newly_infected,
        "edu": edu_context,
        "inventory": inventory,
        "round_ended": round_ended,
        "scores": scores,
    }


# ── Game State ─────────────────────────────────────────────────────────────────
@router.get("/{group_id}/state")
async def get_game_state(group_id: str, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    def _player_inventory(p):
        return [
            {"code": i.id, "type": i.type, "contaminated": i.is_contaminated}
            for i in db.query(models.Item).filter_by(current_owner_id=p.id).all()
        ]

    players_data = [{
        "id": p.id,
        "user_id": p.user_id,
        "username": p.user.username,
        "role": p.role,
        "is_infected": p.is_infected,
        "is_initial_zombie": p.is_initial_zombie or False,
        "is_ready": getattr(p, "is_ready", False),
        "score": p.score or 0,
        "inventory": _player_inventory(p),
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

    # Award final round points if ending mid-game
    if group.game_state in ("round_active", "module_between_rounds"):
        db_queries.award_round_points(db, group_id, is_final_round=True)

    group.game_state = "end_game"
    db.commit()

    await manager.broadcast_to_group(group_id, {"type": "GAME_ENDED"})
    return {"message": "Game ended manually"}


# ── End-Game Recap & Scoreboard ────────────────────────────────────────────────
@router.get("/{group_id}/recap")
async def get_recap(group_id: str, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    total   = len(group.players)
    zombies = [p for p in group.players if p.is_infected]
    surv    = [p for p in group.players if not p.is_infected]
    infection_rate = round(len(zombies) / total * 100) if total else 0

    # ── Per-player enriched data ──────────────────────────────────────────────
    def _player_entry(p):
        # Count trades completed (cards received from others — items where previous_owner != None and current_owner == p)
        trades = db.query(models.Item).filter(
            models.Item.current_owner_id == p.id,
            models.Item.previous_owner_id != None,
        ).count()

        # Count infections caused by this player
        infections_caused = db.query(models.GroupPlayer).filter(
            models.GroupPlayer.infected_by_id == p.id
        ).count()

        # Count objectives met
        owned_types = {i.type for i in db.query(models.Item).filter_by(current_owner_id=p.id).all()}
        objectives = json.loads(p.objectives or '[]')
        objectives_met = len([obj for obj in objectives if obj in owned_types])

        return {
            "username":          p.user.username,
            "score":             p.score or 0,
            "role":              p.role or "survivor",
            "is_infected":       p.is_infected,
            "is_initial_zombie": p.is_initial_zombie or False,
            "trades":            trades,
            "infections_caused": infections_caused,
            "objectives_met":    objectives_met,
            "objectives_total":  len(objectives),
        }

    # ── Build ranked scoreboard ───────────────────────────────────────────────
    scoreboard = sorted(
        [_player_entry(p) for p in group.players],
        key=lambda x: x["score"],
        reverse=True,
    )
    # Assign podium ranks (ties get the same rank)
    prev_score = None
    prev_rank  = 0
    for i, entry in enumerate(scoreboard):
        if entry["score"] != prev_score:
            prev_rank = i + 1
        entry["rank"] = prev_rank
        prev_score = entry["score"]

    podium = scoreboard[:3]   # top 3 for highlighted display

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
        "scoreboard":     scoreboard,
        "podium":         podium,
    }
