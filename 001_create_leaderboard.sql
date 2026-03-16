-- commit: feat(db): create leaderboard table with RLS
-- description: Supabase migration for the leaderboard table.
-- Stores player scores with automation metrics. RLS enabled:
-- anyone can read, only authenticated or anon can insert.
-- Indexed on total_score for fast leaderboard queries.

CREATE TABLE IF NOT EXISTS leaderboard (
  id BIGSERIAL PRIMARY KEY,
  player_name TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  automation_ratio REAL NOT NULL DEFAULT 0,
  automated_harvest INTEGER NOT NULL DEFAULT 0,
  manual_harvest INTEGER NOT NULL DEFAULT 0,
  planets_explored INTEGER NOT NULL DEFAULT 0,
  active_drones INTEGER NOT NULL DEFAULT 0,
  elapsed_time INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for leaderboard queries (top scores)
CREATE INDEX IF NOT EXISTS idx_leaderboard_score
  ON leaderboard (total_score DESC);

-- Index for player personal best lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_player
  ON leaderboard (player_name, total_score DESC);

-- Enable Row Level Security
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Anyone can read the leaderboard
CREATE POLICY "Public read access"
  ON leaderboard
  FOR SELECT
  USING (true);

-- Anyone can submit scores (anon key)
CREATE POLICY "Public insert access"
  ON leaderboard
  FOR INSERT
  WITH CHECK (true);

-- No one can update or delete (immutable scores)
-- (no UPDATE or DELETE policies = denied by default with RLS)
