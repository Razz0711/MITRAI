-- ============================================
-- MitrAI - Migration 002: User Blocking & Reporting Tables
-- Run in Supabase SQL Editor
-- ============================================

-- 1. User Blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_user_id)
);

-- 2. User Reports table
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id);

-- 4. RLS policies
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own blocks
CREATE POLICY "Users can view own blocks" ON user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can insert own blocks" ON user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete own blocks" ON user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- Reports: users can create, only admins (via service role) can update
CREATE POLICY "Users can create reports" ON user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON user_reports
  FOR SELECT USING (auth.uid() = reporter_id);
