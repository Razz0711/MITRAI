-- ============================================
-- MitrAI - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste & Run)
-- ============================================

-- 1. Students
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL DEFAULT '',
  age INT DEFAULT 0,
  email TEXT DEFAULT '',
  admission_number TEXT DEFAULT '',
  city TEXT DEFAULT '',
  country TEXT DEFAULT '',
  timezone TEXT DEFAULT '',
  preferred_language TEXT DEFAULT '',
  department TEXT DEFAULT '',
  current_study TEXT DEFAULT '',
  institution TEXT DEFAULT '',
  year_level TEXT DEFAULT '',
  target_exam TEXT DEFAULT '',
  target_date TEXT DEFAULT '',
  strong_subjects JSONB DEFAULT '[]',
  weak_subjects JSONB DEFAULT '[]',
  currently_studying TEXT DEFAULT '',
  upcoming_topics JSONB DEFAULT '[]',
  learning_type TEXT DEFAULT '',
  study_method JSONB DEFAULT '[]',
  session_length TEXT DEFAULT '',
  break_pattern TEXT DEFAULT '',
  pace TEXT DEFAULT '',
  available_days JSONB DEFAULT '[]',
  available_times TEXT DEFAULT '',
  sessions_per_week INT DEFAULT 0,
  session_type TEXT DEFAULT '',
  study_style TEXT DEFAULT '',
  communication TEXT DEFAULT '',
  teaching_ability TEXT DEFAULT '',
  accountability_need TEXT DEFAULT '',
  video_call_comfort BOOLEAN DEFAULT FALSE,
  short_term_goal TEXT DEFAULT '',
  long_term_goal TEXT DEFAULT '',
  study_hours_target INT DEFAULT 0,
  weekly_goals TEXT DEFAULT ''
);

-- 2. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  student1_id TEXT,
  student2_id TEXT,
  topic TEXT DEFAULT '',
  goal TEXT DEFAULT '',
  start_time TEXT DEFAULT '',
  end_time TEXT DEFAULT '',
  status TEXT DEFAULT 'scheduled',
  summary JSONB
);

-- 3. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT DEFAULT '',
  message TEXT DEFAULT '',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- 4. Materials
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  department TEXT DEFAULT '',
  year_level TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  type TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT '',
  uploaded_by_email TEXT DEFAULT '',
  file_name TEXT DEFAULT '',
  file_size INT DEFAULT 0,
  stored_file_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Availability
CREATE TABLE IF NOT EXISTS availability (
  user_id TEXT PRIMARY KEY,
  slots JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. User statuses
CREATE TABLE IF NOT EXISTS user_statuses (
  user_id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  current_subject TEXT DEFAULT '',
  session_started_at TEXT,
  hide_status BOOLEAN DEFAULT FALSE,
  hide_subject BOOLEAN DEFAULT FALSE
);

-- 7. Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  requester_name TEXT DEFAULT '',
  target_id TEXT NOT NULL,
  target_name TEXT DEFAULT '',
  day TEXT DEFAULT '',
  hour INT DEFAULT 0,
  topic TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Birthday wishes
CREATE TABLE IF NOT EXISTS birthday_wishes (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  from_user_name TEXT DEFAULT '',
  to_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Friend requests
CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  from_user_name TEXT DEFAULT '',
  to_user_id TEXT NOT NULL,
  to_user_name TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Friendships
CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  user1_id TEXT NOT NULL,
  user1_name TEXT DEFAULT '',
  user2_id TEXT NOT NULL,
  user2_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Ratings
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  from_user_name TEXT DEFAULT '',
  to_user_id TEXT NOT NULL,
  to_user_name TEXT DEFAULT '',
  rating INT DEFAULT 0,
  review TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY,
  plan TEXT DEFAULT 'free',
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  transaction_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT DEFAULT '',
  receiver_id TEXT NOT NULL,
  text TEXT DEFAULT '',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);

-- 14. Chat threads
CREATE TABLE IF NOT EXISTS chat_threads (
  chat_id TEXT PRIMARY KEY,
  user1_id TEXT NOT NULL,
  user1_name TEXT DEFAULT '',
  user2_id TEXT NOT NULL,
  user2_name TEXT DEFAULT '',
  last_message TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count1 INT DEFAULT 0,
  unread_count2 INT DEFAULT 0
);

-- ============================================
-- Disable RLS on all tables (server-side only access)
-- ============================================
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_statuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE birthday_wishes DISABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Storage: materials bucket + public access policies
-- Run this AFTER creating the bucket in Supabase Dashboard
-- (Storage → New Bucket → "materials" → Public)
-- OR the app auto-creates it. Then run:
-- ============================================

-- Allow anyone to upload files to the materials bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('materials', 'materials', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access (download)
CREATE POLICY "Public read access" ON storage.objects 
  FOR SELECT USING (bucket_id = 'materials');

-- Allow anyone to upload (insert) files 
CREATE POLICY "Allow uploads" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'materials');

-- Allow anyone to update their uploads
CREATE POLICY "Allow updates" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'materials');

-- Allow anyone to delete files
CREATE POLICY "Allow deletes" ON storage.objects 
  FOR DELETE USING (bucket_id = 'materials');
