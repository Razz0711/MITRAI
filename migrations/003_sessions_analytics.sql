-- ============================================
-- MitrAI - Migration 003: Session History & Analytics support
-- Ensures sessions table exists for analytics
-- Run in Supabase SQL Editor
-- ============================================

-- Sessions table (may already exist)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT DEFAULT '',
  goal TEXT DEFAULT '',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_student1 ON sessions(student1_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student2 ON sessions(student2_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
