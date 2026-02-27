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
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

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
-- Enable Row-Level Security (defense-in-depth)
-- The API routes use the service-role key which bypasses RLS.
-- RLS protects against direct PostgREST abuse via the public anon key.
-- ============================================

-- Students: users can read all profiles, but only modify their own
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_select" ON students FOR SELECT USING (true);
CREATE POLICY "students_modify" ON students FOR ALL USING (id = auth.uid()::text);

-- Sessions: both participants can access
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (
  student1_id = auth.uid()::text OR student2_id = auth.uid()::text
);

-- Notifications: users can only access their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid()::text);

-- Materials: everyone can read, only uploader can modify
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_select" ON materials FOR SELECT USING (true);
CREATE POLICY "materials_insert" ON materials FOR INSERT WITH CHECK (uploaded_by = auth.uid()::text);

-- Availability: users can read all (for booking), only modify own
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "availability_select" ON availability FOR SELECT USING (true);
CREATE POLICY "availability_modify" ON availability FOR ALL USING (user_id = auth.uid()::text);

-- User statuses: public read, own write
ALTER TABLE user_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_select" ON user_statuses FOR SELECT USING (true);
CREATE POLICY "status_modify" ON user_statuses FOR ALL USING (user_id = auth.uid()::text);

-- Bookings: both parties can access
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_access" ON bookings FOR ALL USING (
  requester_id = auth.uid()::text OR target_id = auth.uid()::text
);

-- Birthday wishes: everyone can see, only sender can create
ALTER TABLE birthday_wishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishes_select" ON birthday_wishes FOR SELECT USING (true);
CREATE POLICY "wishes_insert" ON birthday_wishes FOR INSERT WITH CHECK (from_user_id = auth.uid()::text);

-- Friend requests: both parties can access
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friend_requests_access" ON friend_requests FOR ALL USING (
  from_user_id = auth.uid()::text OR to_user_id = auth.uid()::text
);

-- Friendships: both parties can access
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships_access" ON friendships FOR ALL USING (
  user1_id = auth.uid()::text OR user2_id = auth.uid()::text
);

-- Ratings: everyone can read, only rater can create
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_select" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (from_user_id = auth.uid()::text);

-- Subscriptions: users can only access their own
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_own" ON subscriptions FOR ALL USING (user_id = auth.uid()::text);

-- Messages: both sender and receiver can access
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_access" ON messages FOR ALL USING (
  sender_id = auth.uid()::text OR receiver_id = auth.uid()::text
);

-- Chat threads: both parties can access
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_threads_access" ON chat_threads FOR ALL USING (
  user1_id = auth.uid()::text OR user2_id = auth.uid()::text
);

-- Calendar events: users can only access their own
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar_own" ON calendar_events FOR ALL USING (user_id = auth.uid()::text);

-- Attendance: users can only access their own
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_own" ON attendance FOR ALL USING (user_id = auth.uid()::text);

-- OTP codes: server-only (no client access ever)
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
-- No policies = no client access (service role bypasses)

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

-- Allow authenticated users to upload files
CREATE POLICY "Allow uploads" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'materials' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Allow updates" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'materials' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete files
CREATE POLICY "Allow deletes" ON storage.objects 
  FOR DELETE USING (bucket_id = 'materials' AND auth.role() = 'authenticated');

-- ============================================
-- Calendar Events
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'class',
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT DEFAULT '',
  room TEXT DEFAULT '',
  recurring BOOLEAN DEFAULT FALSE,
  recurring_day TEXT DEFAULT '',
  color TEXT DEFAULT '',
  buddy_id TEXT DEFAULT '',
  buddy_name TEXT DEFAULT '',
  created_at TEXT DEFAULT (now()::text)
);

-- Disable RLS (consistent with other tables — using service role key)
-- RLS for calendar_events is enabled in the main RLS block above

-- ============================================
-- Attendance Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  total_classes INT DEFAULT 0,
  attended_classes INT DEFAULT 0,
  last_updated TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);

-- ============================================
-- Additional Performance Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_student1 ON sessions(student1_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student2 ON sessions(student2_id);
CREATE INDEX IF NOT EXISTS idx_bookings_requester ON bookings(requester_id);
CREATE INDEX IF NOT EXISTS idx_bookings_target ON bookings(target_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_ratings_to ON ratings(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_from ON ratings(from_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_user1 ON chat_threads(user1_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_user2 ON chat_threads(user2_id);
CREATE INDEX IF NOT EXISTS idx_birthday_wishes_to ON birthday_wishes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_birthday_wishes_from ON birthday_wishes(from_user_id);
-- RLS for attendance is enabled in the main RLS block above

-- 17. OTP Codes (used for email verification)
CREATE TABLE IF NOT EXISTS otp_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS for otp_codes is enabled in the main RLS block above

-- ============================================
-- SQL Functions
-- ============================================

-- Average rating function (avoids fetching all ratings in JS)
CREATE OR REPLACE FUNCTION get_average_rating(target_user_id TEXT)
RETURNS FLOAT AS $$
  SELECT COALESCE(AVG(rating)::float, 0)
  FROM ratings
  WHERE to_user_id = target_user_id;
$$ LANGUAGE SQL STABLE;
