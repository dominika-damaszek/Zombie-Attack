from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models, database
from routes.auth import get_current_user, cipher_suite
from routes.session import generate_join_code, prepare_session_response

router = APIRouter(prefix="/api", tags=["quicktest"])

BOT_NAMES = ["testbot_alpha", "testbot_beta", "testbot_gamma", "testbot_delta", "testbot_epsilon"]
BOT_PIN = "9999"


@router.post("/quicktest")
async def quicktest(token: str, db: Session = Depends(database.get_db)):
    teacher = get_current_user(token, db)

    new_session = models.Session(
        teacher_id=teacher.id,
        game_mode="normal",
        status="active"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    join_code = generate_join_code()
    while db.query(models.Group).filter(models.Group.join_code == join_code).first():
        join_code = generate_join_code()

    lobby = models.Group(
        session_id=new_session.id,
        group_number=0,
        join_code=join_code,
        game_state="lobby",
        current_round=0,
        secret_word="START",
        game_mode="normal"
    )
    db.add(lobby)
    db.commit()
    db.refresh(lobby)

    encrypted_pin = cipher_suite.encrypt(BOT_PIN.encode()).decode()
    for name in BOT_NAMES:
        user = db.query(models.User).filter(models.User.username == name).first()
        if not user:
            user = models.User(username=name, pin_hash=encrypted_pin)
            db.add(user)
            db.commit()
            db.refresh(user)
        existing = db.query(models.GroupPlayer).filter(
            models.GroupPlayer.group_id == lobby.id,
            models.GroupPlayer.user_id == user.id
        ).first()
        if not existing:
            db.add(models.GroupPlayer(group_id=lobby.id, user_id=user.id))
    db.commit()

    teacher_mp = db.query(models.GroupPlayer).filter(
        models.GroupPlayer.group_id == lobby.id,
        models.GroupPlayer.user_id == teacher.id
    ).first()
    if not teacher_mp:
        teacher_mp = models.GroupPlayer(group_id=lobby.id, user_id=teacher.id)
        db.add(teacher_mp)
        db.commit()
        db.refresh(teacher_mp)

    db.refresh(lobby)
    db.refresh(new_session)

    return {
        "player_session": {
            "groupData": {
                "group_id": lobby.id,
                "session_id": new_session.id,
                "group_number": 0,
                "join_code": join_code,
                "player_count": len(lobby.players)
            },
            "playerData": {"id": teacher_mp.id}
        },
        "session_data": prepare_session_response(new_session)
    }
