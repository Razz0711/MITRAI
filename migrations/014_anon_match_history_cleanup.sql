-- ============================================
-- Migration 014: Anon Match History + Cleanup
-- Tracks who matched with whom (survives ephemeral room deletion)
-- Also cleans up stale data from existing tables
-- ============================================

-- 1. Match history table (for 7-day re-match prevention)
CREATE TABLE IF NOT EXISTS anon_match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matched_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL DEFAULT 'career',
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_anon_match_history_user ON anon_match_history(user_id, matched_at DESC);
CREATE INDEX IF NOT EXISTS idx_anon_match_history_pair ON anon_match_history(user_id, matched_user_id);

-- RLS
ALTER TABLE anon_match_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own match history"
  ON anon_match_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Server can insert match history"
  ON anon_match_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Clean up stale data from existing anon tables
-- Delete all closed rooms and their messages/members (should have been ephemeral)
DELETE FROM anon_messages WHERE room_id IN (SELECT id FROM anon_rooms WHERE status = 'closed');
DELETE FROM anon_room_members WHERE room_id IN (SELECT id FROM anon_rooms WHERE status = 'closed');
DELETE FROM anon_rooms WHERE status = 'closed';

-- Delete stale queue entries (older than 10 minutes)
DELETE FROM anon_queue WHERE joined_at < now() - interval '10 minutes';

-- 3. Auto-cleanup: Add a cron-friendly function to clean stale entries
-- (Can be called via Supabase Edge Function or pg_cron)
CREATE OR REPLACE FUNCTION cleanup_anon_stale()
RETURNS void AS $$
BEGIN
  -- Remove stale queue entries (>10 min old)
  DELETE FROM anon_queue WHERE joined_at < now() - interval '10 minutes';
  -- Remove match history older than 7 days (no longer needed)
  DELETE FROM anon_match_history WHERE matched_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;
