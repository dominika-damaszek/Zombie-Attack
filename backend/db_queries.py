"""
db_queries.py – Centralised analytics / helper queries for the Zombieware game.

Every public function in this file takes a SQLAlchemy Session (db) as its
first argument so it plugs directly into FastAPI's Depends(get_db) pattern.

All query results are plain Python dicts so they can be returned from a
FastAPI endpoint without any extra serialisation step.
"""

from sqlalchemy.orm import Session as DBSession
from sqlalchemy import func, text
import models


# =============================================================================
# ROOM / PLAYER QUERIES
# =============================================================================

def get_room_player_count(db: DBSession, group_id: str) -> int:
    """
    Returns the total number of players currently assigned to a room.

    SQL equivalent:
        SELECT COUNT(*) FROM group_players WHERE group_id = :group_id
    """
    # COUNT(*) is far cheaper than loading all ORM objects just to call len()
    return (
        db.query(func.count(models.GroupPlayer.id))
          .filter(models.GroupPlayer.group_id == group_id)
          .scalar()
    )


def get_room_players(db: DBSession, group_id: str) -> list[dict]:
    """
    Returns a list of every player in the given room with their key attributes.

    Each dict contains:
        player_id   – internal UUID of the GroupPlayer row
        username    – the student's display name (from the linked User)
        role        – 'survivor' or 'zombie'
        is_infected – boolean infection status
        card_count  – how many cards the player currently holds

    SQL equivalent (simplified):
        SELECT gp.id, u.username, gp.role, gp.is_infected,
               COUNT(i.id) AS card_count
        FROM group_players gp
        JOIN users u ON u.id = gp.user_id
        LEFT JOIN items i ON i.current_owner_id = gp.id
        WHERE gp.group_id = :group_id
        GROUP BY gp.id, u.username, gp.role, gp.is_infected
    """
    players = (
        db.query(models.GroupPlayer)
          .filter(models.GroupPlayer.group_id == group_id)
          .all()
    )

    result = []
    for p in players:
        # Count items owned by this player using the Items table
        card_count = (
            db.query(func.count(models.Item.id))
              .filter(models.Item.current_owner_id == p.id)
              .scalar()
        )
        result.append({
            "player_id":   p.id,
            "username":    p.user.username,
            "role":        p.role,
            "is_infected": p.is_infected,
            "card_count":  card_count,
        })
    return result


# =============================================================================
# CARD / ITEM QUERIES
# =============================================================================

def get_player_cards(db: DBSession, player_id: str) -> list[dict]:
    """
    Returns every card currently held by a specific player.

    Each dict contains:
        item_id         – UUID of the Item row
        item_code       – QR-code value (e.g. "QRC-8F2K9L1M")
        card_type       – category string
        is_contaminated – True if the card carries infection

    SQL equivalent:
        SELECT i.id, i.code, i.type, i.is_contaminated
        FROM items i
        WHERE i.current_owner_id = :player_id
    """
    items = (
        db.query(models.Item)
          .filter(models.Item.current_owner_id == player_id)
          .all()
    )

    return [
        {
            "item_id":         item.id,
            "item_code":       item.code,
            "card_type":       item.type,
            "is_contaminated": item.is_contaminated,
        }
        for item in items
    ]


def get_room_cards_in_play(db: DBSession, group_id: str) -> int:
    """
    Returns the total number of distinct cards that are currently in play
    (i.e. have been scanned and assigned) within a room.

    SQL equivalent:
        SELECT COUNT(*) FROM items WHERE group_id = :group_id
    """
    return (
        db.query(func.count(models.Item.id))
          .filter(models.Item.group_id == group_id)
          .scalar()
    )


def get_room_cards_by_type(db: DBSession, group_id: str) -> dict[str, int]:
    """
    Returns how many cards of each type are currently in play in a room.

    Result example:
        {"remedio": 3, "comida": 5, "arma": 2, "roupa": 1, "ferramentas": 4}

    SQL equivalent:
        SELECT type, COUNT(*) AS qty
        FROM items
        WHERE group_id = :group_id
        GROUP BY type
    """
    rows = (
        db.query(models.Item.type, func.count(models.Item.id).label("qty"))
          .filter(models.Item.group_id == group_id)
          .group_by(models.Item.type)
          .all()
    )
    # Return a complete dict with 0 for card types not yet in play
    ALL_TYPES = ["security_patch", "system_boost", "hacking_tool", "firewall", "security_layer"]
    counts = {card_type: 0 for card_type in ALL_TYPES}
    for card_type, qty in rows:
        counts[card_type] = qty
    return counts


def get_player_cards_by_type(db: DBSession, player_id: str) -> dict[str, int]:
    """
    Returns how many cards of each type a specific player currently holds.

    Result example:
        {"remedio": 1, "comida": 0, "arma": 2, "roupa": 1, "ferramentas": 0}

    SQL equivalent:
        SELECT type, COUNT(*) AS qty
        FROM items
        WHERE current_owner_id = :player_id
        GROUP BY type
    """
    rows = (
        db.query(models.Item.type, func.count(models.Item.id).label("qty"))
          .filter(models.Item.current_owner_id == player_id)
          .group_by(models.Item.type)
          .all()
    )
    ALL_TYPES = ["security_patch", "system_boost", "hacking_tool", "firewall", "security_layer"]
    counts = {card_type: 0 for card_type in ALL_TYPES}
    for card_type, qty in rows:
        counts[card_type] = qty
    return counts


# =============================================================================
# COMBINED / DASHBOARD QUERY
# =============================================================================

def get_room_dashboard(db: DBSession, group_id: str) -> dict:
    """
    Single call that returns a full analytics snapshot for a room.
    Useful for a teacher dashboard endpoint.

    Returns a dict with the structure:
    {
        "room_id":          <group_id>,
        "player_count":     <int>,
        "cards_in_play":    <int>,
        "cards_by_type":    { "remedio": N, ... },
        "players": [
            {
                "player_id":      <str>,
                "username":       <str>,
                "role":           <str>,
                "is_infected":    <bool>,
                "card_count":     <int>,
                "cards_by_type":  { "remedio": N, ... },
            },
            ...
        ]
    }
    """
    # ------------------------------------------------------------------
    # 1. Room-level aggregates (two fast COUNT queries)
    # ------------------------------------------------------------------
    player_count  = get_room_player_count(db, group_id)
    cards_in_play = get_room_cards_in_play(db, group_id)
    cards_by_type = get_room_cards_by_type(db, group_id)

    # ------------------------------------------------------------------
    # 2. Per-player detail (one query for all players, then per-player
    #    card-type breakdown)
    # ------------------------------------------------------------------
    players = (
        db.query(models.GroupPlayer)
          .filter(models.GroupPlayer.group_id == group_id)
          .all()
    )

    players_data = []
    for p in players:
        p_card_count = (
            db.query(func.count(models.Item.id))
              .filter(models.Item.current_owner_id == p.id)
              .scalar()
        )
        p_cards_by_type = get_player_cards_by_type(db, p.id)

        players_data.append({
            "player_id":     p.id,
            "username":      p.user.username,
            "role":          p.role,
            "is_infected":   p.is_infected,
            "card_count":    p_card_count,
            "cards_by_type": p_cards_by_type,
        })

    return {
        "room_id":       group_id,
        "player_count":  player_count,
        "cards_in_play": cards_in_play,
        "cards_by_type": cards_by_type,
        "players":       players_data,
    }


# =============================================================================
# QR SCAN HELPER
# =============================================================================

def assign_card_to_player(
    db: DBSession,
    group_id: str,
    player_id: str,
    card_code: str,
) -> dict:
    """
    Core logic for handling a QR-code scan.

    Flow:
      1. Validate the scanned code against the Card catalogue (game.cards / cards table).
         This table is pre-seeded with all 54 physical card codes.
         If the code is not in the catalogue → raise ValueError (invalid QR code).

      2. Get the authoritative card type from the catalogue.
         We never trust the type sent by the frontend; the DB is the single source of truth.

      3. Check whether an Item row already exists for this card code.
         Each physical card has exactly one row in the items table per game session.

         a. If no Item row exists → this is the FIRST scan of this card in this game.
            Create the Item row, set current_owner to the scanning player, and record
            scanned_at (= now, set once, never changed again).

         b. If the Item row exists → this is a RE-SCAN / trade.
            Transfer ownership: move current_owner → previous_owner, set new current_owner.
            Update last_transferred_at to now.
            If the previous owner was infected, the card carries the virus to the new player.

      4. Return a summary dict. The caller (route handler) is responsible for db.commit().

    Parameters
    ----------
    db          : active SQLAlchemy session
    group_id    : UUID of the room/group
    player_id   : UUID of the GroupPlayer who scanned
    card_code   : QR-code string scanned from the physical card (e.g. "ZW-MED-01")
    """
    from datetime import datetime, timezone

    # ── Step 1 & 2: Validate code against the catalogue ───────────────────────
    # The cards table is pre-seeded with all valid physical card codes.
    # If the code is unknown, the scan is rejected with a clear error.
    catalogue_card = db.query(models.Card).filter(models.Card.code == card_code).first()
    if catalogue_card is None:
        raise ValueError(
            f"Unknown card code '{card_code}'. "
            "Only pre-registered physical cards can be scanned."
        )
    # Use the type from the catalogue – do NOT use any value from the request payload.
    card_type = catalogue_card.card_type

    # ── Load the scanning player ───────────────────────────────────────────────
    player = (
        db.query(models.GroupPlayer)
          .filter_by(id=player_id, group_id=group_id)
          .first()
    )
    if player is None:
        raise ValueError(f"Player {player_id} not found in room {group_id}")

    newly_infected  = False
    is_contaminated = False
    now = datetime.now(timezone.utc)

    # ── Step 3a/3b: Check whether an Item row exists for this card IN THIS GROUP ─
    # Same physical card code can exist in multiple groups simultaneously;
    # the unique constraint is on (code, group_id).
    item = (
        db.query(models.Item)
          .filter(models.Item.code == card_code, models.Item.group_id == group_id)
          .first()
    )

    if item is None:
        # ── FIRST SCAN: card enters play in this group for the first time ─────
        item = models.Item(
            code=card_code,                 # QR code string (not the PK)
            type=card_type,                 # from catalogue
            group_id=group_id,
            current_owner_id=player.id,
            previous_owner_id=None,
            is_contaminated=player.is_infected,
            scanned_at=now,
            last_transferred_at=now,
        )
        db.add(item)

    elif item.current_owner_id != player.id:
        # ── RE-SCAN / TRADE: transfer ownership to the scanning player ─────────
        # Record the outgoing owner before overwriting.
        prev_owner_id = item.current_owner_id
        item.previous_owner_id  = prev_owner_id
        item.current_owner_id   = player.id
        item.last_transferred_at = now      # update transfer timestamp

        # Check virus transmission: did the card come from an infected player?
        if prev_owner_id:
            prev_owner = (
                db.query(models.GroupPlayer)
                  .filter_by(id=prev_owner_id)
                  .first()
            )
            if prev_owner and prev_owner.is_infected and not player.is_infected:
                # The card carried the infection – the scanning player becomes a zombie.
                player.is_infected = True
                player.role        = "zombie"
                newly_infected     = True
                is_contaminated    = True

    # If item.current_owner_id == player.id already → player scanned their own card,
    # no action needed (idempotent).

    return {
        "card_code":       card_code,
        "card_type":       card_type,          # from catalogue, not from request
        "owner_id":        player.id,
        "scanned_at":      item.scanned_at.isoformat() if item.scanned_at else now.isoformat(),
        "transferred_at":  now.isoformat(),
        "is_contaminated": is_contaminated,
        "newly_infected":  newly_infected,
    }


# =============================================================================
# OBJECTIVES — group-aware, count-based, provably solvable
# =============================================================================

import json as _json
import random as _random

OBJECTIVE_SLOTS_PER_PLAYER = 3
ALL_CARD_TYPES = ["security_patch", "system_boost", "hacking_tool", "firewall", "security_layer"]


def _normalize_objectives(raw):
    """Accept either the legacy list-of-strings format
    `["security_patch", "system_boost", ...]` or the new count-based format
    `[{"type": "...", "qty": N}, ...]` and always return the count-based one.
    Each unique type appears exactly once in the returned list."""
    if not raw:
        return []
    counts = {}
    for entry in raw:
        if isinstance(entry, dict):
            t = entry.get("type")
            q = int(entry.get("qty") or 0)
            if t and q > 0:
                counts[t] = counts.get(t, 0) + q
        else:
            # legacy string entry — counts as 1 of that type
            counts[entry] = counts.get(entry, 0) + 1
    return [{"type": t, "qty": q} for t, q in counts.items()]


def assign_group_objectives(db: DBSession, group_id: str) -> dict[str, list[dict]]:
    """
    Generate objectives for every survivor in a group AT ONCE.
    Each survivor receives exactly 3 DISTINCT card-type objectives (qty=1 each),
    ensuring they always need to trade for at least 1 card per objective type.
    Zombies receive no objectives.
    """
    group = (
        db.query(models.Group)
          .filter(models.Group.id == group_id)
          .first()
    )
    if not group:
        return {}

    survivors = [p for p in group.players if not p.is_infected]
    if not survivors:
        return {}

    room_supply = get_room_cards_by_type(db, group_id)
    available_types = [t for t in ALL_CARD_TYPES if room_supply.get(t, 0) > 0]
    if not available_types:
        return {}

    p_owned = {p.id: get_player_cards_by_type(db, p.id) for p in survivors}
    remaining = dict(room_supply)

    order = list(survivors)
    _random.shuffle(order)

    result = {}

    for player in order:
        owned_counts = p_owned[player.id]
        chosen_types = []

        # Priority 1: types the player has ZERO of, with supply remaining
        zero_types = [
            t for t in available_types
            if owned_counts.get(t, 0) == 0 and remaining.get(t, 0) > 0
        ]
        _random.shuffle(zero_types)
        for t in zero_types:
            if len(chosen_types) >= OBJECTIVE_SLOTS_PER_PLAYER:
                break
            chosen_types.append(t)
            remaining[t] -= 1

        # Priority 2: any remaining distinct type with supply
        if len(chosen_types) < OBJECTIVE_SLOTS_PER_PLAYER:
            fallback = [
                t for t in available_types
                if t not in chosen_types and remaining.get(t, 0) > 0
            ]
            _random.shuffle(fallback)
            for t in fallback:
                if len(chosen_types) >= OBJECTIVE_SLOTS_PER_PLAYER:
                    break
                chosen_types.append(t)
                remaining[t] -= 1

        # Priority 3: supply exhausted — allow repeats of any available type
        while len(chosen_types) < OBJECTIVE_SLOTS_PER_PLAYER:
            extras = [t for t in available_types if t not in chosen_types]
            if extras:
                chosen_types.append(_random.choice(extras))
            else:
                chosen_types.append(_random.choice(available_types))

        # Each objective is qty=1 (or owned+1 if player already has some)
        final_objs = []
        for t in chosen_types:
            cur = owned_counts.get(t, 0)
            required_qty = min(cur + 1, room_supply.get(t, 1)) if cur > 0 else 1
            final_objs.append({"type": t, "qty": required_qty})

        player.objectives = _json.dumps(final_objs)
        result[player.id] = final_objs

    db.commit()
    return result


# =============================================================================
# SCORING
# =============================================================================

def _objectives_progress(objectives, owned_counts):
    """Return (cards_met, cards_needed) for count-based objectives.
    cards_met counts each card-of-type up to its required qty."""
    objectives = _normalize_objectives(objectives)
    cards_needed = sum(o["qty"] for o in objectives)
    cards_met = sum(min(owned_counts.get(o["type"], 0), o["qty"]) for o in objectives)
    return cards_met, cards_needed


def award_round_points(db: DBSession, group_id: str, is_final_round: bool = False) -> list[dict]:
    """
    Award end-of-round points to all players.

    Scoring rules (trade and infection points are awarded in scan_item /
    trade_done immediately when they happen):

      🛡️  Survivor who survived the round:               +2
      🎯  Per "card slot" of objectives met (cap 3):      +1 each
      🏆  All objective slots fully met (bonus):          +2
      🌟  Final-round survivor bonus:                    +5
      ⭐  Early completion (first round all met,
           survivor only, awarded once):                 +3 × rounds_remaining

    "Rounds remaining" = how many full rounds will follow this one.
    Completing in round 1 → 2 remaining → +6.
    Completing in round 2 → 1 remaining → +3.
    Completing in round 3 (final) → 0 remaining → +0.
    """
    group = (
        db.query(models.Group)
          .filter(models.Group.id == group_id)
          .first()
    )

    players = (
        db.query(models.GroupPlayer)
          .filter(models.GroupPlayer.group_id == group_id)
          .all()
    )

    current_round = (group.current_round or 0) if group else 0
    # Total rounds in the game (currently fixed at 3, see _advance_to_next_round).
    TOTAL_ROUNDS = 3

    results = []

    for player in players:
        delta = 0
        breakdown = []
        early_completion = False

        if not player.is_infected:
            # ── Survived this round ────────────────────────────────────────────
            delta += 2
            breakdown.append({"reason": "Survived round", "pts": 2})

            # ── Count-based objectives progress ────────────────────────────────
            owned_counts = get_player_cards_by_type(db, player.id)
            objectives = _normalize_objectives(_json.loads(player.objectives or '[]'))
            cards_met, cards_needed = _objectives_progress(objectives, owned_counts)

            if cards_met > 0:
                delta += cards_met
                breakdown.append({
                    "reason": f"Objectives met ({cards_met}/{cards_needed})",
                    "pts": cards_met,
                })

            all_met = cards_needed > 0 and cards_met >= cards_needed
            if all_met:
                delta += 2
                breakdown.append({"reason": "All objectives complete!", "pts": 2})

                # ── Early-completion bonus (first time only) ───────────────────
                if not player.early_completion_awarded:
                    rounds_remaining = max(0, TOTAL_ROUNDS - current_round)
                    bonus = 3 * rounds_remaining
                    if bonus > 0:
                        delta += bonus
                        breakdown.append({
                            "reason": f"Early completion bonus (+3 × {rounds_remaining} rounds left)",
                            "pts": bonus,
                        })
                    player.early_completion_awarded = True
                    early_completion = True   # signal frontend to show popup

            # ── Final-round survivor bonus ─────────────────────────────────────
            if is_final_round:
                delta += 5
                breakdown.append({"reason": "Final survivor bonus", "pts": 5})

        player.score = (player.score or 0) + delta
        results.append({
            "player_id":         player.id,
            "username":          player.user.username if player.user else player.id,
            "delta":             delta,
            "score":             player.score,
            "is_zombie":         player.is_infected,
            "breakdown":         breakdown,
            "early_completion":  early_completion,
        })

    db.commit()
    return results
