-- ============================================
-- MitrAI - A6 Migration: Feedback table
-- Run this in Supabase SQL Editor
-- ============================================

-- Feedback table for server-side storage
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT DEFAULT 'Anonymous',
  email TEXT DEFAULT '',
  type TEXT DEFAULT 'feedback',
  rating INT DEFAULT 0,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can insert their own feedback, only service role can read all
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_insert" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "feedback_read_own" ON feedback FOR SELECT USING (
  user_id = (SELECT auth.uid()::text)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
