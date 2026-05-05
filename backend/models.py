from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Text, DateTime
from datetime import datetime, timezone
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
    instruction_slide = Column(Integer, default=0)

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

    # item.id stores the QR-code string (e.g. "ZW-MED-01") – this is the
    # physical code printed on the card and never changes.
    id = Column(String, primary_key=True, index=True)

    # Card category, copied from the Card catalogue at first-scan time.
    # Storing it here avoids a JOIN on every read.
    type = Column(String, nullable=False)

    # Which game room this card is currently active in.
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)

    # The player who currently holds the card (NULL = unassigned / not yet scanned).
    current_owner_id = Column(String, ForeignKey("group_players.id"), nullable=True)

    # The player who held the card immediately before the current owner.
    # Used to detect virus transmission: if previous_owner was infected,
    # the card carries contamination to the new owner.
    previous_owner_id = Column(String, ForeignKey("group_players.id"), nullable=True)

    # Timestamp recorded when this card first enters play (first scan).
    # This is set once and never updated.
    scanned_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Timestamp updated every time ownership changes (card is traded / re-scanned).
    # Equals scanned_at on the first scan; updated on every subsequent transfer.
    last_transferred_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    group = relationship("Group")
    current_owner = relationship("GroupPlayer", foreign_keys=[current_owner_id])
    previous_owner = relationship("GroupPlayer", foreign_keys=[previous_owner_id])

# ── Master card catalogue (54 physical cards) ─────────────────────────────────
class Card(Base):
    __tablename__ = "cards"

    code = Column(String, primary_key=True, index=True)
    card_type = Column(String, nullable=False)
