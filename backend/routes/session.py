from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, database
from routes.auth import get_current_user
import random
import string
import math
import time
from datetime import datetime
from websocket_manager import manager

router = APIRouter(prefix="/session", tags=["session"])

def generate_join_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@router.post("", response_model=schemas.SessionResponse)
def create_session(session_data: schemas.SessionCreate, token: str, db: Session = Depends(database.get_db)):
    user = get_current_user(token, db)
    
    new_session = models.Session(
        teacher_id=user.id,
        game_mode=session_data.game_mode,
        status="active"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # Generate 1 Lobby Group
    join_code = generate_join_code()
    while db.query(models.Group).filter(models.Group.join_code == join_code).first():
        join_code = generate_join_code()
        
    lobby_group = models.Group(
        session_id=new_session.id,
        group_number=0, # 0 means global lobby
        join_code=join_code,
        game_state="lobby",
        current_round=0,
        round_end_time=None,
        scan_end_time=None,
        secret_word="START",
        game_mode=session_data.game_mode
    )
    db.add(lobby_group)
    db.commit()
    db.refresh(new_session)
    
    return prepare_session_response(new_session)

@router.post("/{session_id}/start")
async def start_matchmaking(session_id: str, payload: dict = {}, token: str = None, db: Session = Depends(database.get_db)):
    # this creates groups from the lobby 
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    lobby_group = next((g for g in session.groups if g.group_number == 0), None)
    if not lobby_group:
        raise HTTPException(status_code=400, detail="Lobby group not found")
        
    players = db.query(models.GroupPlayer).filter(models.GroupPlayer.group_id == lobby_group.id).all()
    players_count = len(players)
    if players_count < 6:
        raise HTTPException(status_code=400, detail="Cannot start a game with less than 6 players! We recommend 6-11 players per group.")
        
    # Calculate target number of groups:
    # Groups must have between 6 and 11 players.
    # At 12 players → 2 groups of 6. Use max group size 11 to determine minimum groups needed.
    num_groups = max(1, math.ceil(players_count / 11))
    
    # Create the groups
    new_groups = []
    for i in range(num_groups):
        join_code = generate_join_code()
        while db.query(models.Group).filter(models.Group.join_code == join_code).first():
            join_code = generate_join_code()
            
        group = models.Group(
            session_id=session.id,
            group_number=i + 1,
            join_code=join_code,
            game_state="lobby",
            current_round=0,
            secret_word="START",
            game_mode=session.game_mode,
            last_activity=int(time.time()),
        )
        db.add(group)
        new_groups.append(group)
        
    db.commit()
    for g in new_groups:
        db.refresh(g)
        
    # Shuffle and distribute players
    random.shuffle(players)
    for index, p in enumerate(players):
        group_to_assign = new_groups[index % num_groups]
        p.group_id = group_to_assign.id
    
    db.commit()
    
    # Broadcast to Lobby
    await manager.broadcast_to_group(lobby_group.id, {
        "type": "MATCHMAKING_COMPLETE"
    })
    
    return {"message": "Matchmaking complete", "num_groups": num_groups}

@router.get("/my", response_model=list[schemas.SessionResponse])
def get_my_sessions(token: str, db: Session = Depends(database.get_db)):
    user = get_current_user(token, db)
    sessions = db.query(models.Session).filter(models.Session.teacher_id == user.id).all()
    return [prepare_session_response(s) for s in sessions]

@router.patch("/{session_id}/note")
def set_session_note(session_id: str, payload: dict, token: str, db: Session = Depends(database.get_db)):
    """Save or update the teacher's note for a session (e.g. which class it was)."""
    user = get_current_user(token, db)
    session = db.query(models.Session).filter(
        models.Session.id == session_id,
        models.Session.teacher_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or unauthorized")
    session.note = payload.get("note", "")
    db.commit()
    return {"ok": True, "note": session.note}


@router.delete("/{session_id}")
async def end_session(session_id: str, token: str, db: Session = Depends(database.get_db)):
    user = get_current_user(token, db)
    session = db.query(models.Session).filter(
        models.Session.id == session_id,
        models.Session.teacher_id == user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or unauthorized")
        
    session.status = "finished"
    db.commit()
    
    # Notify all groups in this session that it's over
    for group in session.groups:
        await manager.broadcast_to_group(group.id, {
            "type": "SESSION_TERMINATED",
            "message": "A professora encerrou esta sessão."
        })
        
    return {"message": "Session terminated successfully"}

def prepare_session_response(session: models.Session):
    groups = []
    for g in session.groups:
        # We must include EVERY field that schemas.SessionResponse expects
        groups.append({
            "id": g.id,
            "group_number": g.group_number,
            "join_code": g.join_code,
            "player_count": len(g.players) if hasattr(g, 'players') else 0,
            # --- NEW FIELDS ADDED HERE TO MATCH SCHEMA ---
            "game_state": getattr(g, 'game_state', 'lobby'),
            "current_round": getattr(g, 'current_round', 0),
            "round_end_time": getattr(g, 'round_end_time', None),
            "scan_end_time": getattr(g, 'scan_end_time', None),
            "secret_word": getattr(g, 'secret_word', 'ZOMBIE')
        })
    
    return {
        "id": session.id,
        "game_mode": session.game_mode or "normal",
        "status": getattr(session, 'status', 'active'),
        "groups": sorted(groups, key=lambda x: x['group_number'])
    }