from pydantic import BaseModel
from typing import List, Optional

class UserCreate(BaseModel):
    username: str
    pin: str

class UserLogin(BaseModel):
    username: str
    pin: str

class UserResponse(BaseModel):
    id: str
    username: str

    class Config:
        orm_mode = True

class SessionCreate(BaseModel):
    game_mode: str = "normal"

class GroupResponse(BaseModel):
    id: str
    group_number: int
    join_code: str
    player_count: int
    game_state: str
    current_round: int
    round_end_time: Optional[int]
    scan_end_time: Optional[int]
    secret_word: Optional[str]

    class Config:
        orm_mode = True

class SessionResponse(BaseModel):
    id: str
    game_mode: str = "normal"
    status: str
    groups: List[GroupResponse] = []

    class Config:
        orm_mode = True

class JoinGroupRequest(BaseModel):
    join_code: str

class JoinGroupResponse(BaseModel):
    group_id: str
    session_id: str
    group_number: int
    player_count: int
    player_id: str

class Token(BaseModel):
    access_token: str
    token_type: str
