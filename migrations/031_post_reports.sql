-- ============================================
-- Migration 031: Post Reports
-- Table to handle users flagging/reporting inappropriate feed posts.
-- ============================================

CREATE TABLE IF NOT EXISTS post_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  post_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT 'Inappropriate content',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'removed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reporter_id, post_id) -- A user can only report a specific post once
);

-- Indexes for faster admin queries
CREATE INDEX IF NOT EXISTS post_reports_post_id_idx ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS post_reports_reported_user_id_idx ON post_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS post_reports_status_idx ON post_reports(status);
