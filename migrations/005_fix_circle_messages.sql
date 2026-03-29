-- ============================================
-- MitrRAI - Migration 005: Fix circle_messages table
-- The circle IDs are TEXT not UUID, so we need to recreate
-- Run in Supabase SQL Editor
-- ============================================

-- Drop the old tables if they exist (they have wrong column types)
DROP TABLE IF EXISTS circle_poll_votes CASCADE;
DROP TABLE IF EXISTS circle_messages CASCADE;

-- Recreate with correct TEXT types matching circles table
CREATE TABLE circle_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT DEFAULT '',
  text TEXT DEFAULT '',
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'document', 'poll')),
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_circle_messages_circle ON circle_messages(circle_id);
CREATE INDEX idx_circle_messages_created ON circle_messages(created_at);

-- Poll votes table
CREATE TABLE circle_poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES circle_messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  option_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- RLS
ALTER TABLE circle_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_poll_votes ENABLE ROW LEVEL SECURITY;

-- Policies: allow service role full access, users can read
CREATE POLICY "circle_messages_read" ON circle_messages FOR SELECT USING (true);
CREATE POLICY "circle_messages_insert" ON circle_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "circle_poll_votes_read" ON circle_poll_votes FOR SELECT USING (true);
CREATE POLICY "circle_poll_votes_manage" ON circle_poll_votes FOR ALL USING (true);

-- Enable realtime so messages appear instantly
ALTER PUBLICATION supabase_realtime ADD TABLE circle_messages;
