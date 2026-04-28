from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    pin_hash = Column(String, nullable=False)

    sessions = relationship("Session", back_populates="teacher")
    group_memberships = relationship("GroupPlayer", back_populates="user")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    teacher_id = Column(String, ForeignKey("users.id"), nullable=False)
    num_groups = Column(Integer, default=0)
    players_per_group = Column(Integer, default=0)
    game_mode = Column(String, default="normal")
    status = Column(String, default="waiting")

    teacher = relationship("User", back_populates="sessions")
    groups = relationship("Group", back_populates="session", cascade="all, delete-orphan")

class Group(Base):
    __tablename__ = "groups"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    group_number = Column(Integer, nullable=False)
    join_code = Column(String, unique=True, index=True, nullable=False)

    session = relationship("Session", back_populates="groups")
    players = relationship("GroupPlayer", back_populates="group", cascade="all, delete-orphan")

    game_state = Column(String, default="lobby")
    current_round = Column(Integer, default=0)
    round_end_time = Column(Integer, nullable=True)
    scan_end_time = Column(Integer, nullable=True)
    secret_word = Column(String, nullable=True)
    game_mode = Column(String, default="normal")

class GroupPlayer(Base):
    __tablename__ = "group_players"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    group = relationship("Group", back_populates="players")
    user = relationship("User", back_populates="group_memberships")

    role = Column(String, nullable=True)
    is_infected = Column(Boolean, default=False)
    is_ready = Column(Boolean, default=False)
    has_skipped_trade = Column(Boolean, default=False)

    # Card inventory & objectives (JSON stored as Text)
    inventory = Column(Text, default='[]')
    objectives = Column(Text, default='[]')
    initial_cards_scanned = Column(Integer, default=0)

class Item(Base):
    __tablename__ = "items"

    id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    current_owner_id = Column(String, ForeignKey("group_players.id"), nullable=True)
    previous_owner_id = Column(String, ForeignKey("group_players.id"), nullable=True)

    group = relationship("Group")
    current_owner = relationship("GroupPlayer", foreign_keys=[current_owner_id])
    previous_owner = relationship("GroupPlayer", foreign_keys=[previous_owner_id])

# ── Master card catalogue (54 physical cards) ─────────────────────────────────
class Card(Base):
    __tablename__ = "cards"

    code = Column(String, primary_key=True, index=True)
    card_type = Column(String, nullable=False)
