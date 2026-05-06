-- =============================================================================
-- Zombieware Game – Neon PostgreSQL Schema
-- =============================================================================
-- The backend's SQLAlchemy ORM is now fully mapped to the "game" schema.
-- When the backend starts, it will automatically create all necessary tables
-- (users, sessions, groups, group_players, items, cards) inside this schema.
--
-- Run this file ONCE against your Neon database to initialise the schema
-- and seed the master physical card catalogue.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS game;

-- (The backend will automatically create game.cards and other tables when started)

-- =============================================================================
-- SEED DATA: Physical card catalogue (54 cards)
-- =============================================================================
-- Every physical QR-coded card that exists in the real world.
-- The codes (e.g. QRC-...) are printed on the cards and never change.
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


