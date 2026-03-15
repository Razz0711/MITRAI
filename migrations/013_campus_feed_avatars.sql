-- ============================================
-- Migration 013: Campus Feed + Avatars Storage
-- Creates campus_feed table for anonymous public discussion
-- Creates avatars storage bucket for profile photos
-- ============================================

-- 1. Campus Feed table
CREATE TABLE IF NOT EXISTS campus_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT NOT NULL DEFAULT 'Anonymous',
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast ordering
CREATE INDEX IF NOT EXISTS idx_campus_feed_created_at ON campus_feed(created_at DESC);

-- RLS policies
ALTER TABLE campus_feed ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all messages
CREATE POLICY "Anyone can read campus feed"
  ON campus_feed FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own messages
CREATE POLICY "Users can post to campus feed"
  ON campus_feed FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON campus_feed FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for campus_feed
ALTER PUBLICATION supabase_realtime ADD TABLE campus_feed;

-- 2. Avatars Storage Bucket
-- Run this in SQL editor, or create manually in Supabase Dashboard:
-- Storage > New Bucket > Name: "avatars" > Public: ON
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Anyone can view avatars
CREATE POLICY "Public avatar access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar
CREATE POLICY "Users can upload avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'avatars');

-- Users can update (overwrite) their own avatar
CREATE POLICY "Users can update avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

-- Users can delete their own avatar
CREATE POLICY "Users can delete avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

-- 3. Add photo_url column to students table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
    ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';
  END IF;
END $$;
