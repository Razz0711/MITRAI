-- ============================================
-- MitrAI - Migration 004: Circles, Gamification, Study Rooms, Anonymous Doubts
-- Run in Supabase SQL Editor
-- ============================================

-- ════════════════════════════════════════════
-- 1. CIRCLES (Interest categories)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS circles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '',
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default circles
INSERT INTO circles (id, name, emoji, description, color) VALUES
  ('coding',  'Coding',  '💻', 'Programming, hackathons, code reviews',       '#3b82f6'),
  ('gaming',  'Gaming',  '🎮', 'BGMI, Valorant, Chess & more',                '#ef4444'),
  ('startup', 'Startup', '🚀', 'Build products, find co-founders',            '#f59e0b'),
  ('blogging','Blogging','✍️', 'Writing, peer review, SVNIT blog',            '#8b5cf6'),
  ('music',   'Music',   '🎵', 'Jam sessions, playlists, genre matching',     '#ec4899'),
  ('fitness', 'Fitness', '💪', 'Gym partners, morning runs, nutrition',       '#10b981'),
  ('movies',  'Movies',  '🎬', 'Watch parties, reviews, discussions',         '#f97316')
ON CONFLICT (id) DO NOTHING;

-- Circle memberships
CREATE TABLE IF NOT EXISTS circle_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  circle_id TEXT NOT NULL,
  profile_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, circle_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_memberships_user ON circle_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_memberships_circle ON circle_memberships(circle_id);

-- ════════════════════════════════════════════
-- 2. GAMIFICATION (XP, Badges, Streaks)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_xp (
  user_id TEXT PRIMARY KEY,
  total_xp INT DEFAULT 0,
  level TEXT DEFAULT 'Beginner',
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_active_date TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_emoji TEXT DEFAULT '🏅',
  badge_description TEXT DEFAULT '',
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id);

-- ════════════════════════════════════════════
-- 3. STUDY ROOMS (Group study, 3-5 people)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS study_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT DEFAULT '',
  description TEXT DEFAULT '',
  circle_id TEXT DEFAULT '',
  creator_id TEXT NOT NULL,
  max_members INT DEFAULT 5,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'full')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_rooms_creator ON study_rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_circle ON study_rooms(circle_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_status ON study_rooms(status);

CREATE TABLE IF NOT EXISTS room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT '',
  role TEXT DEFAULT 'member' CHECK (role IN ('creator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);

CREATE TABLE IF NOT EXISTS room_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT DEFAULT '',
  text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room ON room_messages(room_id);

-- ════════════════════════════════════════════
-- 4. ANONYMOUS DOUBTS
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS doubts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  department TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  question TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT TRUE,
  upvotes INT DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doubts_dept ON doubts(department);
CREATE INDEX IF NOT EXISTS idx_doubts_status ON doubts(status);

CREATE TABLE IF NOT EXISTS doubt_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doubt_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT '',
  reply TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_accepted BOOLEAN DEFAULT FALSE,
  upvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doubt_replies_doubt ON doubt_replies(doubt_id);

-- ════════════════════════════════════════════
-- 5. RLS POLICIES
-- ════════════════════════════════════════════
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_replies ENABLE ROW LEVEL SECURITY;

-- Circles: public read
CREATE POLICY "circles_read" ON circles FOR SELECT USING (true);

-- Circle memberships: read all, manage own
CREATE POLICY "circle_memberships_read" ON circle_memberships FOR SELECT USING (true);
CREATE POLICY "circle_memberships_own" ON circle_memberships FOR ALL USING (user_id = auth.uid()::text);

-- XP: read all (for leaderboard), manage own
CREATE POLICY "user_xp_read" ON user_xp FOR SELECT USING (true);
CREATE POLICY "user_xp_own" ON user_xp FOR ALL USING (user_id = auth.uid()::text);

-- Badges: read all, manage own
CREATE POLICY "user_badges_read" ON user_badges FOR SELECT USING (true);
CREATE POLICY "user_badges_own" ON user_badges FOR ALL USING (user_id = auth.uid()::text);

-- XP transactions: own only
CREATE POLICY "xp_transactions_own" ON xp_transactions FOR ALL USING (user_id = auth.uid()::text);

-- Study rooms: public read, creator manages
CREATE POLICY "study_rooms_read" ON study_rooms FOR SELECT USING (true);
CREATE POLICY "study_rooms_create" ON study_rooms FOR INSERT WITH CHECK (creator_id = auth.uid()::text);

-- Room members: public read
CREATE POLICY "room_members_read" ON room_members FOR SELECT USING (true);
CREATE POLICY "room_members_own" ON room_members FOR ALL USING (user_id = auth.uid()::text);

-- Room messages: room members can read/write
CREATE POLICY "room_messages_read" ON room_messages FOR SELECT USING (true);
CREATE POLICY "room_messages_insert" ON room_messages FOR INSERT WITH CHECK (sender_id = auth.uid()::text);

-- Doubts: public read, own manage
CREATE POLICY "doubts_read" ON doubts FOR SELECT USING (true);
CREATE POLICY "doubts_own" ON doubts FOR ALL USING (user_id = auth.uid()::text);

-- Doubt replies: public read, own manage
CREATE POLICY "doubt_replies_read" ON doubt_replies FOR SELECT USING (true);
CREATE POLICY "doubt_replies_own" ON doubt_replies FOR ALL USING (user_id = auth.uid()::text);

-- Enable realtime on room_messages for live group chat
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
