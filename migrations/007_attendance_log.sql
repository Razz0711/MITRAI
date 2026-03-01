-- ============================================
-- Migration 007: Attendance Log Table
-- Per-day per-subject attendance records for calendar view
-- ============================================

-- attendance_log: stores individual daily attendance marks
CREATE TABLE IF NOT EXISTS attendance_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present', -- 'present' or 'absent'
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- One entry per user per subject per day
  UNIQUE(user_id, subject, date)
);

-- Index for fast calendar queries
CREATE INDEX IF NOT EXISTS idx_attendance_log_user_date ON attendance_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_log_user_month ON attendance_log(user_id, date, subject);

-- RLS policies
ALTER TABLE attendance_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (safe re-run)
DROP POLICY IF EXISTS "Users can view own attendance logs" ON attendance_log;
DROP POLICY IF EXISTS "Users can insert own attendance logs" ON attendance_log;
DROP POLICY IF EXISTS "Users can update own attendance logs" ON attendance_log;
DROP POLICY IF EXISTS "Users can delete own attendance logs" ON attendance_log;
DROP POLICY IF EXISTS "Service role full access to attendance_log" ON attendance_log;

-- Users can only see and modify their own logs
CREATE POLICY "Users can view own attendance logs"
  ON attendance_log FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own attendance logs"
  ON attendance_log FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own attendance logs"
  ON attendance_log FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own attendance logs"
  ON attendance_log FOR DELETE
  USING (auth.uid()::text = user_id);

-- Service role bypass (for API routes)
CREATE POLICY "Service role full access to attendance_log"
  ON attendance_log FOR ALL
  USING (true)
  WITH CHECK (true);
