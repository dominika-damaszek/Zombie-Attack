import asyncio
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

# Number of instruction slides per game mode.
# Must match the slide arrays defined in frontend/src/pages/GameScreen.jsx.
# module_1/2/3: 7 slides (indices 0–6)
# normal (Full Game): 7 slides (indices 0–6), same flow as module_3
SLIDES_PER_MODE = {
    "module_1": 7,
    "module_2": 7,
    "module_3": 7,
    "normal":   7,
}

def get_total_slides(mode: str) -> int:
    return SLIDES_PER_MODE.get(mode or "module_1", 7)

# ── WebSocket ──────────────────────────────────────────────────────────────────
@router.websocket("/ws/{group_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, group_id: str, player_id: str):
    await manager.connect(websocket, group_id)

    async def keepalive():
        """Send periodic pings to prevent Render/proxy idle-timeout disconnects."""
        try:
            while True:
                await asyncio.sleep(30)
                await websocket.send_json({"type": "PING"})
        except Exception:
            pass

    ping_task = asyncio.create_task(keepalive())
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "PONG"})
    except WebSocketDisconnect:
        pass
    finally:
        ping_task.cancel()
        manager.disconnect(websocket, group_id)


# ── Start Game ─────────────────────────────────────────────────────────────────
@router.post("/{group_id}/start")
async def start_game(group_id: str, payload: dict = {}, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # The lobby group (group_number == 0) is a waiting room, never a game group.
    if group.group_number == 0:
        raise HTTPException(status_code=400, detail="Cannot start a game on the lobby group")

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
        p.early_completion_awarded = False
        p.has_skipped_trade = False
        p.round_skip_used = False

    group.scan_phase_complete = False

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
    total_slides = get_total_slides(group.game_mode)
    nxt = (group.instruction_slide or 0) + 1
    for p in group.players:
        p.is_ready = False
    _touch(group)
    if nxt >= total_slides:
        group.game_state = "round_active"
        group.current_round = 1
        group.round_end_time = int(time.time()) + 180
        db.commit()
        await manager.broadcast_to_group(group_id, {"type": "ROUND_STARTED"})
    else:
        group.instruction_slide = nxt
        db.commit()
        await manager.broadcast_to_group(group_id, {"type": "SLIDE_ADVANCED", "slide": nxt})


# ── Teacher: skip all slides immediately ─────────────────────────────────────
@router.post("/{group_id}/skip_slides")
async def skip_slides(group_id: str, db: DBSession = Depends(get_db)):
    """Teacher shortcut — jump straight from module_instructions to round_active.
    Useful in classrooms when the teacher wants to skip ahead.
    """
    group = db.query(models.Group).filter_by(id=group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.group_number == 0:
        raise HTTPException(status_code=400, detail="Cannot skip slides on lobby group")
    if group.game_state != "module_instructions":
        raise HTTPException(status_code=400, detail=f"Not in instruction phase (current: {group.game_state})")

    for p in group.players:
        p.is_ready = False
    group.game_state = "round_active"
    group.current_round = 1
    group.round_end_time = int(time.time()) + 180
    _touch(group)
    db.commit()

    await manager.broadcast_to_group(group_id, {"type": "ROUND_STARTED"})
    return {"message": "Slides skipped", "game_state": "round_active"}


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

    # Fresh query after commit to avoid stale ORM session cache (race-condition fix)
    db.expire_all()
    group = db.query(models.Group).filter_by(id=group_id).first()
    all_players = group.players

    ready = sum(1 for p in all_players if p.is_ready)
    total = len(all_players)
    not_ready = [p.user.username for p in all_players if not p.is_ready]

    await manager.broadcast_to_group(group_id, {
        "type": "PLAYER_READY",
        "ready": ready,
        "total": total,
        "not_ready": not_ready,
    })

    if all(p.is_ready for p in all_players):
        await _advance_slide(group, db, group_id)

    slide = group.instruction_slide or 0
    return {"ready": ready, "total": total, "slide": slide}


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
    existing_item = (
        db.query(models.Item)
          .filter(models.Item.code == card_code, models.Item.group_id == group_id)
          .first()
    )
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

        player.initial_cards_scanned = (player.initial_cards_scanned or 0) + 1
        db.commit()

    # Re-fetch inventory directly from DB items table
    inventory_items = db.query(models.Item).filter_by(current_owner_id=player.id).all()
    inventory = [{"code": i.code, "type": i.type, "contaminated": i.is_contaminated} for i in inventory_items]

    objectives = json.loads(player.objectives or '[]')

    if player.initial_cards_scanned >= 4 and not player.is_ready:
        # NOTE: Objectives are NOT assigned here per-player anymore.
        # They are computed once for the entire group, when the last
        # player has scanned all 4 of their cards (so the room composition
        # is fully known and we can guarantee solvability across players).

        player.is_ready = True
        db.commit()

        # Fresh query after commit — avoids stale ORM cache race condition
        db.expire_all()
        group = db.query(models.Group).filter_by(id=group_id).first()

        ready = sum(1 for p in group.players if p.is_ready)
        total = len(group.players)
        not_ready = [p.user.username for p in group.players if not p.is_ready]
        await manager.broadcast_to_group(group_id, {
            "type": "PLAYER_READY",
            "ready": ready,
            "total": total,
            "not_ready": not_ready,
        })

        # If all players finished initial scan → assign group objectives,
        # then advance the slide or start the round.
        if all(p.is_ready for p in group.players):
            db_queries.assign_group_objectives(db, group_id)
            db.expire_all()
            group = db.query(models.Group).filter_by(id=group_id).first()
            await manager.broadcast_to_group(group_id, {"type": "OBJECTIVES_ASSIGNED"})

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

        # Reload my own objectives if they were just assigned in the
        # all-players branch above.
        db.expire_all()
        player = db.query(models.GroupPlayer).filter_by(id=player_id, group_id=group_id).first()
        objectives = json.loads(player.objectives or '[]')

    return {
        "card_type": card.card_type,
        "initial_cards_scanned": player.initial_cards_scanned,
        "inventory": inventory,
        "objectives": objectives,
    }


# ── Module between-rounds ──────────────────────────────────────────────────────
# ── Round-progression helpers ──────────────────────────────────────────────────

async def _advance_to_next_round(group, group_id: str, db: DBSession):
    """Move from awaiting-ready → next round or end_game.

    Called only when every player has clicked "Ready" in the between-rounds
    ready gate (or after the final round, in which case the game ends).
    """
    group.current_round = (group.current_round or 0) + 1
    group.scan_phase_complete = False
    for p in group.players:
        p.is_ready = False
        p.round_skip_used = False   # reset per-round skip flag
        p.has_skipped_trade = False # players can skip again next round

    if group.current_round > 3:
        group.game_state = "end_game"
        db.commit()
        await manager.broadcast_to_group(group_id, {"type": "GAME_ENDED"})
        _check_session_complete(group_id, db)
    else:
        mode = group.game_mode or "normal"
        if mode in ("module_3", "normal") and group.secret_word:
            others = [w for w in WORDS if w != group.secret_word]
            group.secret_word = random.choice(others)
        group.game_state = "round_active"
        group.round_end_time = int(time.time()) + 180
        _touch(group)
        db.commit()
        await manager.broadcast_to_group(group_id, {
            "type": "ROUND_STARTED",
            "secret_word": group.secret_word,
        })


async def _enter_between_rounds(group, group_id: str, db: DBSession, score_results=None):
    """Transition round_active → module_between_rounds (the SCAN phase).

    In this phase every player must scan exactly one new card. Players who
    skipped the trade have nothing new to scan, so they're auto-ready. Once
    every player is ready, we DO NOT auto-advance the round — instead we
    set scan_phase_complete=True so the client shows a "Round N starting"
    popup that requires every player to explicitly click Ready before the
    next round begins (handled by the next_round_ready endpoint).
    """
    group.game_state = "module_between_rounds"
    group.scan_phase_complete = False
    _touch(group)
    for p in group.players:
        # Skippers (round_skip_used) have no card to scan → auto-ready
        p.is_ready = bool(p.round_skip_used)
    db.commit()
    await manager.broadcast_to_group(group_id, {
        "type": "ROUND_ENDED",
        "scores": score_results or [],
    })
    # If all are already ready (everyone skipped) → mark the scan phase
    # complete and reset is_ready for the explicit ready-gate click.
    db.expire_all()
    group = db.query(models.Group).filter_by(id=group_id).first()
    if group and all(p.is_ready for p in group.players):
        await _enter_ready_gate(group, group_id, db)


async def _enter_ready_gate(group, group_id: str, db: DBSession):
    """Mark the scan phase complete and reset is_ready so each player must
    click 'Ready' before the next round actually starts."""
    group.scan_phase_complete = True
    for p in group.players:
        p.is_ready = False
    _touch(group)
    db.commit()
    await manager.broadcast_to_group(group_id, {
        "type": "SCAN_PHASE_COMPLETE",
        "next_round": (group.current_round or 0) + 1,
    })


@router.post("/{group_id}/finish_round")
async def finish_round(group_id: str, db: DBSession = Depends(get_db)):
    """Called when the round timer expires — force-end the round."""
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404)
    if group.game_state != "round_active":
        return {"message": "not_in_active_round"}
    # Mark everyone as ready (time's up)
    for p in group.players:
        p.is_ready = True
    is_final = (group.current_round or 0) >= 3
    score_results = db_queries.award_round_points(db, group_id, is_final_round=is_final)
    await _enter_between_rounds(group, group_id, db, score_results)
    return {"message": "success", "scores": score_results}


@router.post("/{group_id}/next_round")
async def next_round(group_id: str, payload: dict = {}, db: DBSession = Depends(get_db)):
    """Player clicked 'Ready' on the 'Round N starting' popup.

    Only fires after the scan phase is complete (every player has scanned
    their 1 card for the round). Marks the calling player ready; once all
    players are ready, advances to the next round (or ends the game).
    """
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404)
    if group.game_state != "module_between_rounds":
        return {"message": "already_advanced"}
    if not group.scan_phase_complete:
        return {"message": "waiting_for_scans"}

    player_id = payload.get("player_id")
    if player_id:
        player = db.query(models.GroupPlayer).filter_by(
            id=player_id, group_id=group_id
        ).first()
        if player:
            player.is_ready = True
            _touch(group)
            db.commit()
            db.expire_all()
            group = db.query(models.Group).filter_by(id=group_id).first()
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
        await _advance_to_next_round(group, group_id, db)
        return {"message": "round_started"}

    return {"message": "waiting_for_others"}


@router.post("/{group_id}/trade_done")
async def trade_done(group_id: str, payload: dict, db: DBSession = Depends(get_db)):
    """
    Player signals they've finished their trading decision for the round.

    Payload:
        player_id   – UUID of the calling player (required)
        partner_id  – UUID of the player they traded/declined with (optional)
        action      – "accept" | "decline" (optional, only meaningful in m3/normal)

    Scoring (only the calling player's own score is ever modified — never the
    partner's, to prevent score-tampering exploits where one client subtracts
    from another player's total without their consent):

        accept  + both survivors  (m3/normal) → +2  (good cooperation)
        decline + partner is zombie (m3/normal)→ +2  (correct identification)
        decline + partner survivor (m3/normal) → -2  (false accusation)

    In module_1 (no zombies) and module_2 (no password to verify with), the
    accept/decline mechanic isn't meaningful — the call simply marks the
    player as ready with no point change.
    """
    player_id = payload.get("player_id")
    partner_id = payload.get("partner_id")
    action = payload.get("action")

    player = db.query(models.GroupPlayer).filter_by(id=player_id).first()
    if not player:
        raise HTTPException(status_code=404)

    group = player.group
    mode = group.game_mode or "normal"
    accusation_mode = mode in ("module_3", "normal")

    # Apply accept/decline scoring only in modes where authentication makes sense.
    if accusation_mode and partner_id and action in ("accept", "decline"):
        partner = db.query(models.GroupPlayer).filter_by(
            id=partner_id, group_id=group_id
        ).first()
        if partner and partner.id != player.id:
            if action == "accept":
                if not player.is_infected and not partner.is_infected:
                    player.score = (player.score or 0) + 2
            elif action == "decline":
                if not player.is_infected:
                    if partner.is_infected:
                        # Correctly identified a zombie
                        player.score = (player.score or 0) + 2
                    else:
                        # Wrongly accused a survivor
                        player.score = (player.score or 0) - 2
            # NOTE: We intentionally do NOT modify partner.score — a player
            # cannot affect another player's score without their own action.

    player.is_ready = True
    _touch(group)
    db.commit()

    # Fresh query after commit — avoids stale ORM cache
    db.expire_all()
    group = db.query(models.Group).filter_by(id=group_id).first()

    if all(p.is_ready for p in group.players):
        is_final = (group.current_round or 0) >= 3
        score_results = db_queries.award_round_points(db, group_id, is_final_round=is_final)
        await _enter_between_rounds(group, group_id, db, score_results)
        return {"message": "success", "scores": score_results}
    else:
        await manager.broadcast_to_group(group_id, {"type": "PLAYER_READY"})

    return {"message": "success"}


@router.post("/{group_id}/skip_trade")
async def skip_trade(group_id: str, payload: dict, db: DBSession = Depends(get_db)):
    """
    Skip the trading round.

    Payload fields:
        player_id         – UUID of the player who is skipping
        skip_reason       – "no_partner" | "suspect_zombie"
        accused_player_id – (only when skip_reason == "suspect_zombie") UUID of
                            the player being accused of being a zombie

    Scoring rules:
        no_partner (any mode)             → +2  (survived with no trade partner)
        suspect_zombie correct (m3/normal)→ +3 to accuser, -2 to accused zombie
        suspect_zombie wrong  (m3/normal) → -2 to accuser
    """
    player_id = payload.get("player_id")
    skip_reason = payload.get("skip_reason", "no_partner")
    accused_player_id = payload.get("accused_player_id")

    player = db.query(models.GroupPlayer).filter_by(id=player_id).first()
    if not player:
        raise HTTPException(status_code=404)

    if player.has_skipped_trade:
        raise HTTPException(status_code=400, detail="Skip trade already used.")

    group = player.group
    mode = group.game_mode or "normal"
    accusation_allowed = mode in ("module_3", "normal")

    # ── Handle accusation ──────────────────────────────────────────────────
    accusation_result = None
    if skip_reason == "suspect_zombie" and accusation_allowed and accused_player_id:
        accused = db.query(models.GroupPlayer).filter_by(
            id=accused_player_id, group_id=group_id
        ).first()
        if not accused or accused.id == player.id:
            raise HTTPException(status_code=400, detail="Invalid accused player")

        if accused.is_infected:
            # CORRECT — accused IS a zombie
            player.score = (player.score or 0) + 3
            accused.score = (accused.score or 0) - 2
            accusation_result = "correct"
        else:
            # WRONG — accused is a survivor
            player.score = (player.score or 0) - 2
            accusation_result = "wrong"
    else:
        # "no_partner" or module_1/2 → +2 survival points
        player.score = (player.score or 0) + 2

    player.has_skipped_trade = True
    player.round_skip_used = True
    player.is_ready = True
    db.commit()

    # Broadcast the skip result so all clients can update
    await manager.broadcast_to_group(group_id, {
        "type": "SKIP_RESULT",
        "player_id": player.id,
        "username": player.user.username,
        "skip_reason": skip_reason,
        "accusation_result": accusation_result,
        "accused_player_id": accused_player_id,
    })

    # Re-fetch after commit to avoid stale ORM cache
    db.expire_all()
    group = db.query(models.Group).filter_by(id=group_id).first()

    if all(p.is_ready for p in group.players):
        is_final = (group.current_round or 0) >= 3
        score_results = db_queries.award_round_points(db, group_id, is_final_round=is_final)
        await _enter_between_rounds(group, group_id, db, score_results)
        return {"message": "success", "accusation_result": accusation_result, "scores": score_results}
    else:
        await manager.broadcast_to_group(group_id, {"type": "PLAYER_READY"})

    return {"message": "success", "accusation_result": accusation_result}


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

    # ── 0. Phase gating (all modes) ─────────────────────────────────────────
    # Trading happens PHYSICALLY during round_active. Players only scan
    # their newly-received card AFTER the round ends (in
    # module_between_rounds). Each player may scan exactly one card per
    # between-rounds phase.
    if group.game_state == "round_active":
        raise HTTPException(
            status_code=400,
            detail="scan_locked_during_round",
        )
    if group.game_state == "module_between_rounds":
        # Once scan_phase_complete is set, the UI should show the ready
        # gate, not the scanner. Reject any further scans.
        if group.scan_phase_complete:
            raise HTTPException(
                status_code=400,
                detail="scan_phase_already_complete",
            )
        # 1 scan per player per round.
        if player.is_ready:
            raise HTTPException(
                status_code=400,
                detail="already_scanned_this_round",
            )

    # ── 1. Validate the QR code against the master catalogue ──────────────────
    catalogue_card = db.query(models.Card).filter_by(code=card_code).first()
    if not catalogue_card:
        raise HTTPException(status_code=400, detail=f"Unknown card code: {card_code}")

    # ── 2. Look up the live item row (scoped to THIS group) ─────────────────
    item = db.query(models.Item).filter_by(code=card_code, group_id=group_id).first()
    edu_context = None
    newly_infected = False

    if not item:
        # Card has never been scanned in this group before — create it.
        item = models.Item(
            code=card_code,
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
        # Idempotent – player already owns this card, no transfer needed.
        # We still need to count this as "the player has scanned their card
        # for the round" — otherwise a player who rescans one of their own
        # cards (or didn't actually trade physically) would never be marked
        # ready and the between-rounds scan phase would stall forever.
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

    # In the between-rounds scan phase, ANY successful scan counts as the
    # player completing their per-round scan obligation — not just trades.
    # This avoids stalls when a player rescans one of their own cards or
    # the trade was unilateral.
    if group.game_state == "module_between_rounds":
        player.is_ready = True

    _touch(group)
    db.commit()

    # ── Check if this scan triggers a round/phase transition ─────────────────
    round_ended = False
    scores = None

    if player.is_ready:
        db.expire_all()
        group = db.query(models.Group).filter_by(id=group_id).first()

        if group.game_state == "module_between_rounds":
            # Player scanned their 1 received card → check if all players
            # have scanned theirs. When the last player finishes, transition
            # to the ready gate (scan_phase_complete=True). The round will
            # only advance once every player explicitly clicks "Ready".
            if all(p.is_ready for p in group.players):
                await _enter_ready_gate(group, group_id, db)
                round_ended = True
            else:
                await manager.broadcast_to_group(group_id, {"type": "PLAYER_READY"})

    # ── 5. Build inventory from DB (no JSON blob) ─────────────────────────────
    inventory = [
        {"code": i.code, "type": i.type, "contaminated": i.is_contaminated}
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
            {"code": i.code, "type": i.type, "contaminated": i.is_contaminated}
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
        "early_completion_awarded": getattr(p, "early_completion_awarded", False),
    } for p in group.players]

    ready_count = sum(1 for p in group.players if p.is_ready)
    not_ready = [p.user.username for p in group.players if not p.is_ready]

    # Check if session is finished
    session = db.query(models.Session).filter_by(id=group.session_id).first()
    session_status = session.status if session else "unknown"

    return {
        "game_state":          group.game_state,
        "current_round":       group.current_round,
        "round_end_time":      group.round_end_time,
        "scan_end_time":       group.scan_end_time,
        "secret_word":         group.secret_word,
        "game_mode":           group.game_mode,
        "instruction_slide":   group.instruction_slide or 0,
        "ready_count":         ready_count,
        "not_ready":           not_ready,
        "players":             players_data,
        "session_status":      session_status,
        "scan_phase_complete": getattr(group, "scan_phase_complete", False),
    }


@router.post("/{group_id}/ready")
async def toggle_ready(group_id: str, payload: dict, db: DBSession = Depends(get_db)):
    player_id = payload.get("player_id")
    if not player_id:
        raise HTTPException(status_code=400, detail="Missing player_id")

    # Resolve by player id only — after matchmaking the client may still POST using
    # the old lobby group_id while the membership row already points at a game group.
    player = db.query(models.GroupPlayer).filter(models.GroupPlayer.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    effective_group_id = player.group_id

    player.is_ready = True
    _touch(player.group)
    db.commit()

    await manager.broadcast_to_group(effective_group_id, {
        "type": "PLAYER_READY",
        "player_id": player_id
    })

    # Fresh query after commit — avoids stale ORM cache (race-condition fix)
    db.expire_all()
    group = db.query(models.Group).filter_by(id=effective_group_id).first()
    game_started = False
    if len(group.players) > 0 and all(p.is_ready for p in group.players):
        if group.game_state == "lobby":
            try:
                await start_game(effective_group_id, {}, db)
                game_started = True
            except Exception as e:
                print(f"[toggle_ready] auto start_game failed: {e}")

    return {"message": "Player ready", "game_started": game_started}


def _check_session_complete(group_id: str, db: DBSession):
    """If all non-lobby groups in this session are end_game, mark the session finished."""
    group = db.query(models.Group).filter_by(id=group_id).first()
    if not group:
        return
    session = db.query(models.Session).filter_by(id=group.session_id).first()
    if not session or session.status == "finished":
        return
    non_lobby = [g for g in session.groups if g.group_number != 0]
    if non_lobby and all(g.game_state == "end_game" for g in non_lobby):
        session.status = "finished"
        db.commit()


@router.post("/{group_id}/end")
async def end_game_manual(group_id: str, db: DBSession = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Protect the lobby group from being accidentally ended
    if group.group_number == 0:
        raise HTTPException(status_code=400, detail="Cannot end the lobby group")

    # Award final round points if ending mid-game
    if group.game_state in ("round_active", "module_between_rounds"):
        db_queries.award_round_points(db, group_id, is_final_round=True)

    group.game_state = "end_game"
    db.commit()

    await manager.broadcast_to_group(group_id, {"type": "GAME_ENDED"})
    _check_session_complete(group_id, db)
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

        # Count objectives met (handles both legacy string format and count-based dict format)
        owned_items = db.query(models.Item).filter_by(current_owner_id=p.id).all()
        owned_counts = {}
        for it in owned_items:
            owned_counts[it.type] = owned_counts.get(it.type, 0) + 1
        objectives = json.loads(p.objectives or '[]')
        objectives_met = 0
        for obj in objectives:
            if isinstance(obj, dict):
                if owned_counts.get(obj.get("type"), 0) >= (obj.get("qty") or 1):
                    objectives_met += 1
            else:
                if obj in owned_counts:
                    objectives_met += 1

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

    session_note = None
    if group.session:
        session_note = getattr(group.session, 'note', None)

    return {
        "total_players":  total,
        "survivors":      len(surv),
        "zombies":        len(zombies),
        "infection_rate": infection_rate,
        "game_mode":      group.game_mode,
        "rounds_played":  group.current_round,
        "last_activity":  group.last_activity,
        "session_note":   session_note,
        "lessons":        lessons,
        "zombie_names":   [p.user.username for p in zombies],
        "survivor_names": [p.user.username for p in surv],
        "scoreboard":     scoreboard,
        "podium":         podium,
    }
