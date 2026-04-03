-- ===========================================================
-- Migration: Away From Barn + Horse Not Rideable
-- Run this in Supabase SQL Editor
-- ===========================================================

-- Away From Barn — riders marked as unavailable
CREATE TABLE IF NOT EXISTS away_from_barn (
  id          BIGSERIAL PRIMARY KEY,
  rider_id    BIGINT NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  all_day     BOOLEAN NOT NULL DEFAULT TRUE,
  start_time  TIME,          -- null when all_day = true
  end_time    TIME,          -- null when all_day = true
  reason      TEXT DEFAULT '',
  show_id     BIGINT REFERENCES shows(id) ON DELETE SET NULL,
  created_by  TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT afb_date_range CHECK (end_date >= start_date),
  CONSTRAINT afb_time_range CHECK (
    all_day = TRUE OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

-- Indexes for common queries
CREATE INDEX idx_afb_rider_dates ON away_from_barn (rider_id, start_date, end_date);
CREATE INDEX idx_afb_show ON away_from_barn (show_id) WHERE show_id IS NOT NULL;

-- Horse Not Rideable — horses marked as unavailable
CREATE TABLE IF NOT EXISTS horse_unavailable (
  id          BIGSERIAL PRIMARY KEY,
  horse_id    BIGINT NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  all_day     BOOLEAN NOT NULL DEFAULT TRUE,
  start_time  TIME,          -- null when all_day = true
  end_time    TIME,          -- null when all_day = true
  reason      TEXT DEFAULT '',
  created_by  TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT hnr_date_range CHECK (end_date >= start_date),
  CONSTRAINT hnr_time_range CHECK (
    all_day = TRUE OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

CREATE INDEX idx_hnr_horse_dates ON horse_unavailable (horse_id, start_date, end_date);

-- Enable RLS (match your existing table policies)
ALTER TABLE away_from_barn ENABLE ROW LEVEL SECURITY;
ALTER TABLE horse_unavailable ENABLE ROW LEVEL SECURITY;

-- Permissive policies — adjust to match your existing auth patterns
CREATE POLICY "Allow all access to away_from_barn"
  ON away_from_barn FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to horse_unavailable"
  ON horse_unavailable FOR ALL USING (true) WITH CHECK (true);
