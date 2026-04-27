from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session as DBSession
from database import get_db
import models
from websocket_manager import manager
import random
import time

router = APIRouter(prefix="/api/game", tags=["game"])

# ── Word pools ─────────────────────────────────────────────────────────────────
WORDS = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT",
         "CIPHER", "PROXY", "TOKEN", "VAULT", "SHIELD", "PATCH"]

ROUND_EVENTS = [
    {"id": "firewall_down", "title": "🔥 Firewall Down!", "desc": "All Firewalls lose their protection for 60 seconds."},
    {"id": "audit",         "title": "🔍 Security Audit", "desc": "All players must verify identity. Analysts reveal one player's status."},
    {"id": "patch",         "title": "⚡ Emergency Patch", "desc": "One random Zombie becomes cured for this round only."},
    {"id": "zero_trust",    "title": "🚫 Zero Trust Mode", "desc": "No item trades for 30 seconds. Trust no one."},
]

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

    # ── Role Assignment by mode ────────────────────────────────────────────────
    for p in players:
        p.role = "survivor"
        p.is_infected = False
        p.is_ready = False

    event = None
    
    # ── Role & Password Assignment logic ──────────────────────────
    if mode == "module_1":
        # Pure trading, no zombies
        zombie_count = 0
        group.secret_word = None
    elif mode == "module_2":
        # Zombies introduced, but no passwords yet
        zombie_count = max(1, int(len(players) * 0.15))
        group.secret_word = None
    elif mode == "module_3":
        # Zombies AND passwords
        zombie_count = max(1, int(len(players) * 0.15))
        group.secret_word = random.choice(WORDS)
    else:
        # Standard games
        group.secret_word = random.choice(WORDS)
        if mode == "easy":
            zombie_count = max(1, int(len(players) * 0.15))
        elif mode == "hard":
            zombie_count = max(1, int(len(players) * 0.30))
            survivors_list = list(players)
            random.shuffle(survivors_list)
            if len(survivors_list) > 1:
                survivors_list[0].role = "firewall"
            if len(survivors_list) > 2:
                survivors_list[1].role = "analyst"
            event = random.choice(ROUND_EVENTS)
        else:
            zombie_count = max(1, int(len(players) * 0.30))

    if zombie_count > 0:
        zombie_players = random.sample(
            [p for p in players if p.role == "survivor"], min(zombie_count, len(players))
        )
        for p in zombie_players:
            p.role = "zombie"
            p.is_infected = True

    # ── Timers & State ──────────────────────────────────────────
    if mode.startswith("module"):
        group.game_state = "module_instructions"
        group.current_round = 0
        group.round_end_time = None
    else:
        duration = 240 if mode == "easy" else 300
        group.game_state = "round_active"
        group.current_round = 1
        group.round_end_time = int(time.time()) + duration
        
        if mode == "hard":
            event = random.choice(ROUND_EVENTS)

    db.commit()

    # ── Broadcast ─────────────────────────────────────────────────────────────
    await manager.broadcast_to_group(group_id, {
        "type": "GAME_STARTED",
        "state": group.game_state,
        "mode": mode,
        "round_end_time": group.round_end_time,
        "event": event,
    })

    return {"message": "Game started", "mode": mode, "event": event}

# ── Module Management ──────────────────────────────────────────────────────────
@router.post("/{group_id}/finish_instructions")
async def finish_instructions(group_id: str, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group: raise HTTPException(status_code=404)
    # Move to initial scan phase (between-rounds before round 1 actually)
    group.game_state = "module_between_rounds"
    group.current_round = 0
    group.round_end_time = None
    for p in group.players:
        p.is_ready = False
    db.commit()
    await manager.broadcast_to_group(group_id, {"type": "ROUND_ENDED"})
    return {"message": "success"}

@router.post("/{group_id}/finish_round")
async def finish_round(group_id: str, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group: raise HTTPException(status_code=404)
    group.game_state = "module_between_rounds"
    for p in group.players:
        p.is_ready = False
    db.commit()
    await manager.broadcast_to_group(group_id, {"type": "ROUND_ENDED"})
    return {"message": "success"}

@router.post("/{group_id}/next_round")
async def next_round(group_id: str, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group: raise HTTPException(status_code=404)
    
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
    if not player: raise HTTPException(status_code=404)
    
    player.is_ready = True
    db.commit()

    group = player.group
    # Check if everyone is ready
    if all(p.is_ready for p in group.players):
        # Force round to end early
        group.game_state = "module_between_rounds"
        for p in group.players:
            p.is_ready = False
        db.commit()
        await manager.broadcast_to_group(group_id, {"type": "ROUND_ENDED"})
    else:
        # Just broadcast that someone is ready (optional, helps UI)
        await manager.broadcast_to_group(group_id, {"type": "PLAYER_READY"})
    
    return {"message": "success"}

@router.post("/{group_id}/skip_trade")
async def skip_trade(group_id: str, payload: dict, db: DBSession = Depends(get_db)):
    player_id = payload.get("player_id")
    player = db.query(models.GroupPlayer).filter_by(id=player_id).first()
    if not player: raise HTTPException(status_code=404)

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

# ── Scan Item ──────────────────────────────────────────────────────────────────
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

    edu_context = None  # educational popup context to return

    if not item:
        item = models.Item(
            id=item_id,
            type=item_data.get("type", "unknown"),
            group_id=group_id,
            current_owner_id=player.id,
            previous_owner_id=None,
        )
        db.add(item)
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

            # ── Infection logic by mode ────────────────────────────────────────
            newly_infected = False

            if mode == "easy":
                # Easy: no infection via items
                edu_context = {
                    "title": "✅ Safe Exchange",
                    "body": "In Easy mode items are safe. Real systems use checksums to verify file integrity.",
                    "tag": "integrity_check",
                }
            else:
                # Normal/Hard: infection if previous owner was infected
                if prev_owner and prev_owner.is_infected and not player.is_infected:
                    # Firewall role blocks infection in Hard mode
                    if player.role == "firewall" and mode == "hard":
                        edu_context = {
                            "title": "🛡️ Firewall Blocked!",
                            "body": "Your Firewall role blocked the infection. Firewalls inspect traffic and reject malicious content.",
                            "tag": "firewall",
                        }
                    else:
                        player.is_infected = True
                        player.role = "zombie"
                        newly_infected = True
                        edu_context = {
                            "title": "🦠 Malware Transferred!",
                            "body": "You received a file from an infected source. This is how malware spreads — always verify who you receive files from (Zero Trust).",
                            "tag": "malware_spread",
                        }
                        await manager.broadcast_to_group(group_id, {
                            "type": "PLAYER_INFECTED",
                            "player_id": player.id,
                        })

                # Analyst can inspect in Hard mode
                if player.role == "analyst" and mode == "hard" and prev_owner:
                    edu_context = {
                        "title": "🔍 Analyst Insight",
                        "body": f"As an Analyst you can see: previous holder was {'INFECTED' if prev_owner.is_infected else 'CLEAN'}. Security analysts audit logs to trace threats.",
                        "tag": "threat_analysis",
                        "prev_owner_infected": prev_owner.is_infected,
                    }

    db.commit()

    return {
        "message": "Scan processed",
        "infected": player.is_infected,
        "edu": edu_context,
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
    } for p in group.players]

    return {
        "game_state":    group.game_state,
        "current_round": group.current_round,
        "round_end_time": group.round_end_time,
        "scan_end_time": group.scan_end_time,
        "secret_word":   group.secret_word,
        "game_mode":     group.game_mode,
        "players":       players_data,
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
        {"icon": "🔑", "concept": "Authentication",     "lesson": "Passwords are like secret words — only share them with verified parties."},
        {"icon": "🦠", "concept": "Malware Spread",     "lesson": "Infection spread through item scanning mirrors how malware propagates via file sharing."},
        {"icon": "🚫", "concept": "Zero Trust",          "lesson": "Never trust automatically — always verify before accepting items (files/data)."},
        {"icon": "🛡️", "concept": "Firewall",            "lesson": "Firewalls inspect and block suspicious traffic, just like the Firewall role blocks infection."},
        {"icon": "🔍", "concept": "Threat Analysis",     "lesson": "Analysts investigate incidents — tracing the infection chain helps identify Patient Zero."},
    ]

    return {
        "total_players":   total,
        "survivors":       len(surv),
        "zombies":         len(zombies),
        "infection_rate":  infection_rate,
        "game_mode":       group.game_mode,
        "rounds_played":   group.current_round,
        "lessons":         lessons,
        "zombie_names":    [p.user.username for p in zombies],
        "survivor_names":  [p.user.username for p in surv],
    }
