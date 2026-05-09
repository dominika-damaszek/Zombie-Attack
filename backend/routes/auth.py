import asyncio
import os
import base64
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, database
from cryptography.fernet import Fernet
from jose import jwt

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "ZOMBIEWARE_SECRET_KEY_DEV_ONLY")
# We need a 32-url-safe-base64-encoded string for Fernet.
# Pad or truncate SECRET_KEY to 32 bytes and base64 encode it.
_fernet_key = base64.urlsafe_b64encode(SECRET_KEY.ljust(32, '0')[:32].encode('utf-8'))
cipher_suite = Fernet(_fernet_key)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7


def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(token: str, db: Session = Depends(database.get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.post("/register", response_model=schemas.Token)
async def register(user_data: schemas.UserCreate, db: Session = Depends(database.get_db)):
    existing_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    # Encrypt the pin with Fernet (two-way encryption instead of bcrypt hash)
    encrypted_pin = cipher_suite.encrypt(user_data.pin.encode("utf-8")).decode("utf-8")

    new_user = models.User(username=user_data.username, pin_hash=encrypted_pin)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=schemas.Token)
async def login(user_data: schemas.UserLogin, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or pin")

    # Decrypt the stored pin and compare it with the provided pin
    try:
        decrypted_pin = cipher_suite.decrypt(user.pin_hash.encode("utf-8")).decode("utf-8")
        is_valid = (decrypted_pin == user_data.pin)
    except Exception:
        # Fallback for old accounts if any
        is_valid = False

    if not is_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or pin")

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
def get_me(token: str, db: Session = Depends(database.get_db)):
    return get_current_user(token, db)


@router.get("/history")
def get_history(token: str, db: Session = Depends(database.get_db)):
    user = get_current_user(token, db)

    as_teacher = []
    sessions = db.query(models.Session).filter(models.Session.teacher_id == user.id).all()
    for s in sessions:
        non_lobby_groups = [g for g in s.groups if g.group_number != 0]
        total_players = sum(len(g.players) for g in non_lobby_groups)
        as_teacher.append({
            "session_id": s.id,
            "game_mode": s.game_mode or "normal",
            "status": s.status,
            "num_groups": len(non_lobby_groups),
            "total_players": total_players,
            "note": getattr(s, 'note', None),
            "groups": [
                {
                    "group_id": g.id,
                    "group_number": g.group_number,
                    "game_state": g.game_state,
                    "player_count": len(g.players),
                    "current_round": g.current_round or 0,
                }
                for g in non_lobby_groups
            ],
        })

    as_student = []
    memberships = db.query(models.GroupPlayer).filter(models.GroupPlayer.user_id == user.id).all()
    for gp in memberships:
        group = gp.group
        if group is None or group.group_number == 0:
            continue
        as_student.append({
            "group_id": group.id,
            "group_number": group.group_number,
            "game_mode": group.game_mode or "normal",
            "game_state": group.game_state,
            "role": gp.role,
            "survived": not gp.is_infected,
            "rounds_played": group.current_round or 0,
        })

    return {"as_teacher": as_teacher, "as_student": as_student}


@router.get("/stats")
def get_stats(token: str, db: Session = Depends(database.get_db)):
    """Return aggregate player stats and recent game history for the profile page."""
    user = get_current_user(token, db)

    memberships = (
        db.query(models.GroupPlayer)
          .filter(models.GroupPlayer.user_id == user.id)
          .all()
    )

    finished_games = []
    for gp in memberships:
        group = gp.group
        if group is None or group.group_number == 0:
            continue
        if group.game_state != "end_game":
            continue

        # Compute rank within this group
        all_players = sorted(group.players, key=lambda p: p.score or 0, reverse=True)
        rank = next((i + 1 for i, p in enumerate(all_players) if p.id == gp.id), None)
        total_players = len(all_players)

        # Count trades and infections caused
        trades = db.query(models.Item).filter(
            models.Item.current_owner_id == gp.id,
            models.Item.previous_owner_id != None,
        ).count()
        infections_caused = db.query(models.GroupPlayer).filter(
            models.GroupPlayer.infected_by_id == gp.id
        ).count()

        session_note = getattr(group.session, 'note', None) if group.session else None

        finished_games.append({
            "group_id":          group.id,
            "game_mode":         group.game_mode or "normal",
            "role":              gp.role or "survivor",
            "survived":          not gp.is_infected,
            "score":             gp.score or 0,
            "rank":              rank,
            "total_players":     total_players,
            "trades":            trades,
            "infections_caused": infections_caused,
            "rounds_played":     group.current_round or 0,
            "last_activity":     group.last_activity,
            "session_note":      session_note,
        })

    scores = [g["score"] for g in finished_games]
    total_games = len(finished_games)
    total_score = sum(scores)
    best_score  = max(scores) if scores else 0
    avg_score   = round(total_score / total_games, 1) if total_games else 0
    wins        = sum(1 for g in finished_games if g["rank"] == 1)
    survived    = sum(1 for g in finished_games if g["survived"])

    recent = sorted(finished_games, key=lambda g: g["score"], reverse=True)[:10]

    return {
        "username":    user.username,
        "total_games": total_games,
        "total_score": total_score,
        "best_score":  best_score,
        "avg_score":   avg_score,
        "wins":        wins,
        "survived":    survived,
        "recent_games": recent,
    }
