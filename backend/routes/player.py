from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, database
from routes.auth import get_current_user
from websocket_manager import manager

router = APIRouter(prefix="/player", tags=["player"])

@router.post("/join", response_model=schemas.JoinGroupResponse)
async def join_group(join_data: schemas.JoinGroupRequest, token: str, db: Session = Depends(database.get_db)):
    user = get_current_user(token, db)
    
    # Check if group exists
    group = db.query(models.Group).filter(models.Group.join_code == join_data.join_code).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or invalid join code")
        
    session = group.session

    # Check if user is already in this group
    existing_membership = db.query(models.GroupPlayer).filter(
        models.GroupPlayer.group_id == group.id,
        models.GroupPlayer.user_id == user.id
    ).first()

    # Only block NEW players from joining — existing members can always reconnect.
    # The lobby group (group_number == 0) is always open; only block actual game
    # groups that have already finished so students can't sneak into ended games.
    if not existing_membership:
        if session and getattr(session, 'status', 'active') == 'finished':
            raise HTTPException(status_code=403, detail="This session has already ended")
        if group.group_number != 0 and group.game_state in ('end_game', 'game_over'):
            raise HTTPException(status_code=403, detail="This game has already ended")

    if not existing_membership:
        membership = models.GroupPlayer(group_id=group.id, user_id=user.id)
        db.add(membership)
        db.commit()
        db.refresh(membership)
        player_id = membership.id
    else:
        player_id = existing_membership.id
        
    # Broadcast to anyone currently in the group
    await manager.broadcast_to_group(group.id, {"type": "PLAYER_JOINED"})
    
    # Return updated group info
    db.refresh(group)
    return {
        "group_id": group.id,
        "session_id": session.id,
        "group_number": group.group_number,
        "player_count": len(group.players),
        "player_id": player_id,
        "join_code": group.join_code,
    }

@router.get("/{player_id}/group", response_model=schemas.JoinGroupResponse)
def get_player_group(player_id: str, db: Session = Depends(database.get_db)):
    membership = db.query(models.GroupPlayer).filter(models.GroupPlayer.id == player_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Player not found")
        
    group = membership.group
    return {
        "group_id": group.id,
        "session_id": group.session_id,
        "group_number": group.group_number,
        "player_count": len(group.players),
        "player_id": player_id,
        "join_code": group.join_code,
    }
