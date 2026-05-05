-- =============================================================================
-- Zombieware Game – Neon PostgreSQL Schema
-- =============================================================================
-- Run this file ONCE against your Neon database to initialise all tables.
-- Neon dashboard → SQL Editor → paste & run.
--
-- Schema namespace: "game"
-- All game data lives here, keeping it separate from any future schemas.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS game;

-- Drop tables in reverse-dependency order so foreign keys don't block the drop.
DROP TABLE IF EXISTS game.items        CASCADE;
DROP TABLE IF EXISTS game.cards        CASCADE;
DROP TABLE IF EXISTS game.item_types   CASCADE;
DROP TABLE IF EXISTS game.players      CASCADE;
DROP TABLE IF EXISTS game.rooms        CASCADE;

-- Also add the CARDS table (catalogue) before ITEMS (which references it)

-- -----------------------------------------------------------------------------
-- ROOMS
-- A "room" is one active game group.  Players join a room via its room_code.
-- session_id is a free-text reference back to the teacher's session (UUID string).
-- -----------------------------------------------------------------------------
CREATE TABLE game.rooms (
    room_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Short alphanumeric code players type to join (e.g. "AB12CD")
    room_code  CHAR(6)      NOT NULL UNIQUE,

    -- Links to the teacher session that owns this room (not a FK – stored as text
    -- so the rooms table stays self-contained even if sessions are managed elsewhere)
    session_id TEXT         NOT NULL,

    -- Current phase of the game ("lobby", "round_active", "end_game", …)
    game_state VARCHAR(30)  NOT NULL DEFAULT 'lobby',

    -- Which module/mode is being played ("normal", "module_1", …)
    game_mode  VARCHAR(20)  NOT NULL DEFAULT 'normal',

    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- PLAYERS
-- One row per player per room.  When a user joins a room the backend inserts
-- (or upserts) a row here so the room-membership is persisted in the database.
-- -----------------------------------------------------------------------------
CREATE TABLE game.players (
    player_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Display name chosen by the student
    player_name VARCHAR(20)  NOT NULL,

    -- Which room this player belongs to
    room_id     UUID         NOT NULL
                REFERENCES game.rooms(room_id) ON DELETE CASCADE,

    -- "survivor" or "zombie" – assigned when the game starts
    role        VARCHAR(10)  NOT NULL DEFAULT 'survivor',

    -- TRUE once the zombie virus has been transferred to this player
    is_infected BOOLEAN      NOT NULL DEFAULT FALSE,

    joined_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- ITEM_TYPES  (card-type catalogue)
-- Fixed lookup table for the five card categories.
-- Seeded once (see INSERT below) – never changes during a game.
-- -----------------------------------------------------------------------------
CREATE TABLE game.item_types (
    item_type_id   SERIAL       PRIMARY KEY,

    -- Human-readable category name matching what is printed on the physical card
    item_type_name VARCHAR(20)  NOT NULL UNIQUE
);


-- -----------------------------------------------------------------------------
-- ITEMS  (individual scanned cards)
-- One row per physical card that has been scanned during a game.
-- When a player scans a QR code the backend upserts a row here and sets
-- owner_id to the scanning player.  This replaces the old JSON inventory field.
--
-- Why store room_id here?
--   It allows single-table queries for "cards in play per room" and
--   "cards of each type per room" without joining through players.
-- -----------------------------------------------------------------------------
CREATE TABLE game.items (
    item_id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- QR-code value printed on the physical card (e.g. "ZW-MED-01").
    -- Must exist in game.cards – validated before this row is created.
    item_code       VARCHAR(20)  NOT NULL UNIQUE
                    REFERENCES game.cards(card_code) ON UPDATE CASCADE,

    -- Category of this card (denormalised from game.cards for fast reads)
    item_type_id    INT          NOT NULL
                    REFERENCES game.item_types(item_type_id) ON DELETE CASCADE,

    -- Which room this card is currently being used in
    room_id         UUID         NOT NULL
                    REFERENCES game.rooms(room_id) ON DELETE CASCADE,

    -- The player who currently holds the card (NULL = not yet assigned)
    owner_id        UUID
                    REFERENCES game.players(player_id) ON DELETE SET NULL,

    -- TRUE if the card was handed over by an infected player (carries the virus)
    is_contaminated BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Timestamp set once when the card is first scanned into this game session.
    -- Never updated after creation.
    scanned_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Timestamp updated every time the card changes hands (trade / re-scan).
    -- On first scan this equals scanned_at; updated on every ownership transfer.
    last_transferred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- SEED DATA
-- =============================================================================

-- ── 1. Item types (card categories) ──────────────────────────────────────────
-- Five fixed categories. ON CONFLICT makes this safe to re-run.
INSERT INTO game.item_types (item_type_name) VALUES
    ('remedio'),
    ('comida'),
    ('arma'),
    ('roupa'),
    ('ferramentas')
ON CONFLICT (item_type_name) DO NOTHING;


-- ── 2. Physical card catalogue (54 cards) ────────────────────────────────────
-- Every physical QR-coded card that exists in the real world.
-- The codes (e.g. ZW-MED-01) are printed on the cards and never change.
-- When a player scans a code, the backend looks up this table first.
INSERT INTO game.cards (card_code, card_type) VALUES
    -- Medicine / Remedio (11 cards)
    ('QRC-8F2K9L1M','remedio'), ('QRC-4X7P3N8V','remedio'), ('QRC-9B6T2R5Y','remedio'),
    ('QRC-1M8Z4K7Q','remedio'), ('QRC-7D3L9W2X','remedio'), ('QRC-5H1V8N4P','remedio'),
    ('QRC-2R7Y6F9K','remedio'), ('QRC-8J4Q1T3M','remedio'), ('QRC-6N9X2L5B','remedio'),
    ('QRC-3P7K8V1D','remedio'), ('QRC-9W2M4R6H','remedio'),

    -- Food / Comida (11 cards)
    ('QRC-1X5T7N8J','comida'), ('QRC-4L9B2Q6Y','comida'), ('QRC-7V3K1M8F','comida'),
    ('QRC-2H6P9X4T','comida'), ('QRC-8R1D5N7W','comida'), ('QRC-5Q7L3V9K','comida'),
    ('QRC-3T8M2Y6P','comida'), ('QRC-9N4F1X7J','comida'), ('QRC-6K2W8R5L','comida'),
    ('QRC-1P9V4T3H','comida'), ('QRC-7X5M2Q8D','comida'),

    -- Weapon / Arma (11 cards)
    ('QRC-4R8N6L1Y','arma'), ('QRC-2J3K9W7P','arma'), ('QRC-8B6T1V4M','arma'),
    ('QRC-5Y2L7Q9X','arma'), ('QRC-3N8P4R6K','arma'), ('QRC-9D1M5T7H','arma'),
    ('QRC-6V4X2K8J','arma'), ('QRC-1Q7W9L3F','arma'), ('QRC-7P2N6Y8R','arma'),
    ('QRC-4M9K1T5D','arma'), ('QRC-2X8V3L7H','arma'),

    -- Clothing / Roupa (11 cards)
    ('QRC-8T5Q4N1J','roupa'), ('QRC-5R7B9M2W','roupa'), ('QRC-3L1Y6K8P','roupa'),
    ('QRC-9H4X7T2V','roupa'), ('QRC-6N8Q5P1D','roupa'), ('QRC-1V3M9R7K','roupa'),
    ('QRC-7K2T8L4Y','roupa'), ('QRC-4P6X1N9J','roupa'), ('QRC-2W7M5Q3H','roupa'),
    ('QRC-8D4R9V6L','roupa'), ('QRC-5J1T7K2P','roupa'),

    -- Tools / Ferramentas (10 cards)
    ('QRC-3X9N4B8F','ferramentas'), ('QRC-9Q6L2M5W','ferramentas'), ('QRC-6Y3P8T1D','ferramentas'),
    ('QRC-1R7V4K9H','ferramentas'), ('QRC-7N2X6Q5J','ferramentas'), ('QRC-4T8M1L3P','ferramentas'),
    ('QRC-2K5W9R7D','ferramentas'), ('QRC-8V1P4Y6N','ferramentas'), ('QRC-5M7Q2T8H','ferramentas'),
    ('QRC-5Q3T4K7D','ferramentas')
ON CONFLICT (card_code) DO NOTHING;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Fast lookup of all players in a room (JOIN / GROUP BY room queries)
CREATE INDEX IF NOT EXISTS idx_players_room_id   ON game.players(room_id);

-- Fast lookup of all items in a room (room-level card analytics)
CREATE INDEX IF NOT EXISTS idx_items_room_id     ON game.items(room_id);

-- Fast lookup of all items owned by a specific player
CREATE INDEX IF NOT EXISTS idx_items_owner_id    ON game.items(owner_id);

-- Fast lookup of all items of a given type (type-level analytics)
CREATE INDEX IF NOT EXISTS idx_items_type_id     ON game.items(item_type_id);

-- Composite index: all items of a given type within a specific room
CREATE INDEX IF NOT EXISTS idx_items_room_type   ON game.items(room_id, item_type_id);

-- Composite index: all items of a given type owned by a specific player
CREATE INDEX IF NOT EXISTS idx_items_owner_type  ON game.items(owner_id, item_type_id);
