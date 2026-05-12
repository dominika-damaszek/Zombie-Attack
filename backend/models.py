from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Text, DateTime, UniqueConstraint
from datetime import datetime, timezone
from sqlalchemy.orm import relationship
from database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'schema': 'game'}

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    pin_hash = Column(String, nullable=False)

    sessions = relationship("Session", back_populates="teacher")
    group_memberships = relationship("GroupPlayer", back_populates="user")

class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = {'schema': 'game'}

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    teacher_id = Column(String, ForeignKey("game.users.id"), nullable=False)
    num_groups = Column(Integer, default=0)
    players_per_group = Column(Integer, default=0)
    game_mode = Column(String, default="normal")
    status = Column(String, default="waiting")

    note = Column(String, nullable=True)

    teacher = relationship("User", back_populates="sessions")
    groups = relationship("Group", back_populates="session", cascade="all, delete-orphan")

class Group(Base):
    __tablename__ = "groups"
    __table_args__ = {'schema': 'game'}

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    session_id = Column(String, ForeignKey("game.sessions.id"), nullable=False)
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
    last_activity = Column(Integer, nullable=True)
    secret_word_category = Column(String, nullable=True)

    # ── Between-rounds scan / ready gate ─────────────────────────────────────
    # True once every player has scanned their 1 new card during the
    # `module_between_rounds` phase. While True, the UI shows a
    # "Round N starting" popup and waits for every player to click Ready
    # (which sets is_ready=False → True via the next_round_ready endpoint)
    # before the next round actually begins.
    scan_phase_complete = Column(Boolean, default=False, nullable=False)

class GroupPlayer(Base):
    __tablename__ = "group_players"
    __table_args__ = {'schema': 'game'}

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    group_id = Column(String, ForeignKey("game.groups.id"), nullable=False)
    user_id = Column(String, ForeignKey("game.users.id"), nullable=False)

    group = relationship("Group", back_populates="players")
    user = relationship("User", back_populates="group_memberships")

    role = Column(String, nullable=True)
    is_infected = Column(Boolean, default=False)
    # True only for the player randomly selected as zombie at game start.
    # Never changes during gameplay, even if others are later infected.
    is_initial_zombie = Column(Boolean, default=False)
    is_ready = Column(Boolean, default=False)
    has_skipped_trade = Column(Boolean, default=False)
    # True for the round in which the player used their skip (reset every round).
    # Used to auto-mark the skipper as ready in module_between_rounds (they have no card to scan).
    round_skip_used = Column(Boolean, default=False)

    # Infection tracking: who infected this player and in which round.
    # Used to award one-time infection points to the infector.
    infected_by_id = Column(String, nullable=True)
    infected_in_round = Column(Integer, nullable=True)

    # Card inventory & objectives (JSON stored as Text)
    # NOTE: inventory is deprecated as source-of-truth; game.items is now authoritative.
    inventory = Column(Text, default='[]')
    objectives = Column(Text, default='[]')
    initial_cards_scanned = Column(Integer, default=0)
    # Cumulative points accumulated across all rounds.
    score = Column(Integer, default=0, nullable=False)

    # ── Early completion tracking ────────────────────────────────────────────
    # Set to True the first time the player has met every objective in full
    # (count-based: owned[type] >= qty for each entry) at end-of-round.
    # Used to (a) award the +3-per-remaining-round bonus exactly once and
    # (b) trigger a "Congratulations" popup on the client only once.
    early_completion_awarded = Column(Boolean, default=False, nullable=False)

class Item(Base):
    __tablename__ = "items"
    __table_args__ = (
        UniqueConstraint('code', 'group_id', name='uq_item_code_group'),
        {'schema': 'game'},
    )

    # UUID primary key — allows the same physical card to exist in multiple
    # groups simultaneously (each group gets its own row per card code).
    id = Column(String, primary_key=True, default=generate_uuid, index=True)

    # The QR-code string printed on the physical card (e.g. "QRC-8F2K9L1M").
    # Unique only within a group — the same code can appear in different groups.
    code = Column(String, nullable=False, index=True)

    # Card category, copied from the Card catalogue at first-scan time.
    type = Column(String, nullable=False)

    # Which game room this card is currently active in.
    group_id = Column(String, ForeignKey("game.groups.id"), nullable=False)

    # The player who currently holds the card (NULL = unassigned / not yet scanned).
    current_owner_id = Column(String, ForeignKey("game.group_players.id"), nullable=True)

    # The player who held the card immediately before the current owner.
    # Used to detect virus transmission: if previous_owner was infected,
    # the card carries contamination to the new owner.
    previous_owner_id = Column(String, ForeignKey("game.group_players.id"), nullable=True)

    # True if this card was ever held by an infected player.
    # Once contaminated, always contaminated (infection persists on the card).
    is_contaminated = Column(Boolean, default=False, nullable=False)

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
    __table_args__ = {'schema': 'game'}

    code = Column(String, primary_key=True, index=True)
    card_type = Column(String, nullable=False)
