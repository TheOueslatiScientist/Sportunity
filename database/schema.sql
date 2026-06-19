-- ============================================================
-- Sportunity — Database Schema
-- PostgreSQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS sportunity;
\c sportunity;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ─── Sports ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sports (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  icon  VARCHAR(10)  NOT NULL DEFAULT '🏅',
  color VARCHAR(7)   NOT NULL DEFAULT '#64748b'
);

-- ─── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  avatar_url   TEXT,
  bio          TEXT,
  level        VARCHAR(20) CHECK (level IN ('beginner','intermediate','advanced','pro')),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  city         VARCHAR(100),
  is_coach     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- ─── User Sports (many-to-many) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sports (
  user_id  INTEGER REFERENCES users(id)   ON DELETE CASCADE,
  sport_id INTEGER REFERENCES sports(id)  ON DELETE CASCADE,
  PRIMARY KEY (user_id, sport_id)
);

-- ─── Infrastructures ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS infrastructures (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  type       VARCHAR(50)  NOT NULL
             CHECK (type IN ('football','basketball','tennis','running','gym','swimming','volleyball','padel','other')),
  address    TEXT,
  lat        DECIMAL(10, 8) NOT NULL,
  lng        DECIMAL(11, 8) NOT NULL,
  is_public  BOOLEAN DEFAULT TRUE,
  status     VARCHAR(20) DEFAULT 'available'
             CHECK (status IN ('available','occupied','maintenance')),
  image_url  TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Events ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id                 SERIAL PRIMARY KEY,
  title              VARCHAR(255) NOT NULL,
  sport_id           INTEGER REFERENCES sports(id),
  infrastructure_id  INTEGER REFERENCES infrastructures(id),
  creator_id         INTEGER REFERENCES users(id),
  date               TIMESTAMP NOT NULL,
  max_participants   INTEGER DEFAULT 10,
  description        TEXT,
  level              VARCHAR(20) CHECK (level IN ('beginner','intermediate','advanced','all')),
  created_at         TIMESTAMP DEFAULT NOW()
);

-- ─── Event Participants ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_participants (
  event_id  INTEGER REFERENCES events(id)  ON DELETE CASCADE,
  user_id   INTEGER REFERENCES users(id)   ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- ─── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  content     TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── Coaches ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coaches (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  sport_id         INTEGER REFERENCES sports(id),
  hourly_rate      DECIMAL(10, 2),
  description      TEXT,
  experience_years INTEGER,
  rating           DECIMAL(3, 2) DEFAULT 0,
  certifications   TEXT[],
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_infrastructures_lat_lng ON infrastructures(lat, lng);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
