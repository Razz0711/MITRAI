-- ============================================
-- Migration 009: Campus Radar, Skill Swap & Campus Feed
-- New tables for radar pings, skill offers, and post types on doubts
-- ============================================

-- 1. Campus Radar - broadcast what you're doing right now
CREATE TABLE IF NOT EXISTS radar_pings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Anonymous',
  activity_id TEXT NOT NULL,          -- e.g. 'dsa', 'cricket', 'chai'
  zone TEXT DEFAULT 'campus',          -- e.g. 'library', 'canteen', 'ground'
  note TEXT DEFAULT '',                -- optional short message
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '2 hours')
);

-- Index for fast "active pings" query
CREATE INDEX IF NOT EXISTS idx_radar_pings_expires ON radar_pings(expires_at);
CREATE INDEX IF NOT EXISTS idx_radar_pings_user ON radar_pings(user_id);

-- RLS
ALTER TABLE radar_pings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active pings
CREATE POLICY "Anyone can read active pings" ON radar_pings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own pings
CREATE POLICY "Users can insert own pings" ON radar_pings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own pings
CREATE POLICY "Users can delete own pings" ON radar_pings
  FOR DELETE USING (auth.uid() = user_id);


-- 2. Skill Swap - offer to teach/learn skills
CREATE TABLE IF NOT EXISTS skill_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'Anonymous',
  can_teach TEXT[] NOT NULL DEFAULT '{}',      -- array of skill strings
  want_to_learn TEXT[] NOT NULL DEFAULT '{}',  -- array of skill strings
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skill_offers_user ON skill_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_offers_active ON skill_offers(is_active);

-- RLS
ALTER TABLE skill_offers ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active offers
CREATE POLICY "Anyone can read skill offers" ON skill_offers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own offers
CREATE POLICY "Users can insert own offers" ON skill_offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own offers
CREATE POLICY "Users can update own offers" ON skill_offers
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own offers
CREATE POLICY "Users can delete own offers" ON skill_offers
  FOR DELETE USING (auth.uid() = user_id);


-- 3. Add post_type to doubts table for Campus Feed
-- Allows: 'doubt', 'confession', 'spotted', 'hot-take', 'advice'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doubts' AND column_name = 'post_type'
  ) THEN
    ALTER TABLE doubts ADD COLUMN post_type TEXT DEFAULT 'doubt';
  END IF;
END $$;

-- Index for filtering by post type
CREATE INDEX IF NOT EXISTS idx_doubts_post_type ON doubts(post_type);


-- 4. Cleanup function - auto-delete expired radar pings (optional cron)
-- Run this periodically via pg_cron or Supabase edge function
-- SELECT cron.schedule('cleanup-radar', '*/30 * * * *', $$DELETE FROM radar_pings WHERE expires_at < now()$$);
