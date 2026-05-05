import asyncio
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, database
import bcrypt
from jose import jwt

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "ZOMBIEWARE_SECRET_KEY_DEV_ONLY")
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

    loop = asyncio.get_event_loop()
    hashed_pin = await loop.run_in_executor(
        None,
        lambda: bcrypt.hashpw(user_data.pin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
    )

    new_user = models.User(username=user_data.username, pin_hash=hashed_pin)
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

    loop = asyncio.get_event_loop()
    is_valid = await loop.run_in_executor(
        None,
        lambda: bcrypt.checkpw(user_data.pin.encode("utf-8"), user.pin_hash.encode("utf-8")),
    )

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
