-- ============================================================
-- MitrAI — COMPLETE Supabase SQL Setup
-- Run this ONCE in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS everywhere
-- ============================================================


-- ════════════════════════════════════════════
-- TABLE 1: students
-- ════════════════════════════════════════════
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
  weekly_goals TEXT DEFAULT '',
  dob TEXT DEFAULT '',
  show_birthday BOOLEAN DEFAULT TRUE,
  -- Smart email parsing columns (Migration 001)
  match_key VARCHAR(10) DEFAULT '',
  program_type VARCHAR(1) DEFAULT '',
  batch_year VARCHAR(2) DEFAULT '',
  dept_code VARCHAR(3) DEFAULT '',
  roll_no VARCHAR(5) DEFAULT '',
  dept_known BOOLEAN DEFAULT true,
  profile_auto_filled BOOLEAN DEFAULT false
);

-- If table already exists, add columns individually
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS show_birthday BOOLEAN DEFAULT TRUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS match_key VARCHAR(10) DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS program_type VARCHAR(1) DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS batch_year VARCHAR(2) DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS dept_code VARCHAR(3) DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS roll_no VARCHAR(5) DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS dept_known BOOLEAN DEFAULT true;
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_auto_filled BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_students_match_key ON students(match_key);


-- ════════════════════════════════════════════
-- TABLE 2: sessions
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  student1_id TEXT,
  student2_id TEXT,
  topic TEXT DEFAULT '',
  goal TEXT DEFAULT '',
  start_time TEXT DEFAULT '',
  end_time TEXT DEFAULT '',
  status TEXT DEFAULT 'scheduled',
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_sessions_student1 ON sessions(student1_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student2 ON sessions(student2_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);


-- ════════════════════════════════════════════
-- TABLE 3: notifications
-- ════════════════════════════════════════════
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


-- ════════════════════════════════════════════
-- TABLE 4: materials
-- ════════════════════════════════════════════
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


-- ════════════════════════════════════════════
-- TABLE 5: availability
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS availability (
  user_id TEXT PRIMARY KEY,
  slots JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════
-- TABLE 6: user_statuses
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_statuses (
  user_id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  current_subject TEXT DEFAULT '',
  session_started_at TEXT,
  hide_status BOOLEAN DEFAULT FALSE,
  hide_subject BOOLEAN DEFAULT FALSE
);


-- ════════════════════════════════════════════
-- TABLE 7: bookings
-- ════════════════════════════════════════════
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

CREATE INDEX IF NOT EXISTS idx_bookings_requester ON bookings(requester_id);
CREATE INDEX IF NOT EXISTS idx_bookings_target ON bookings(target_id);


-- ════════════════════════════════════════════
-- TABLE 8: birthday_wishes
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS birthday_wishes (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  from_user_name TEXT DEFAULT '',
  to_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_birthday_wishes_to ON birthday_wishes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_birthday_wishes_from ON birthday_wishes(from_user_id);


-- ════════════════════════════════════════════
-- TABLE 9: friend_requests
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  from_user_name TEXT DEFAULT '',
  to_user_id TEXT NOT NULL,
  to_user_name TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id);


-- ════════════════════════════════════════════
-- TABLE 10: friendships
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  user1_id TEXT NOT NULL,
  user1_name TEXT DEFAULT '',
  user2_id TEXT NOT NULL,
  user2_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);


-- ════════════════════════════════════════════
-- TABLE 11: ratings
-- ════════════════════════════════════════════
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

CREATE INDEX IF NOT EXISTS idx_ratings_to ON ratings(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_from ON ratings(from_user_id);


-- ════════════════════════════════════════════
-- TABLE 12: subscriptions
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY,
  plan TEXT DEFAULT 'free',
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  transaction_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════
-- TABLE 13: messages
-- ════════════════════════════════════════════
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


-- ════════════════════════════════════════════
-- TABLE 14: chat_threads
-- ════════════════════════════════════════════
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

CREATE INDEX IF NOT EXISTS idx_chat_threads_user1 ON chat_threads(user1_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_user2 ON chat_threads(user2_id);


-- ════════════════════════════════════════════
-- TABLE 15: calendar_events
-- ════════════════════════════════════════════
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

CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);


-- ════════════════════════════════════════════
-- TABLE 16: attendance
-- ════════════════════════════════════════════
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


-- ════════════════════════════════════════════
-- TABLE 17: otp_codes
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS otp_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════
-- TABLE 18: feedback
-- ════════════════════════════════════════════
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

CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);


-- ════════════════════════════════════════════
-- TABLE 19: user_blocks
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  blocked_user_id TEXT NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id);


-- ════════════════════════════════════════════
-- TABLE 20: user_reports
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  reported_user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id);


-- ════════════════════════════════════════════════════════════
-- ENABLE ROW-LEVEL SECURITY (RLS) ON ALL TABLES
-- ════════════════════════════════════════════════════════════
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthday_wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════════════
-- DROP EXISTING POLICIES (safe cleanup for re-runs)
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "students_select" ON students;
DROP POLICY IF EXISTS "students_modify" ON students;
DROP POLICY IF EXISTS "sessions_select" ON sessions;
DROP POLICY IF EXISTS "notifications_own" ON notifications;
DROP POLICY IF EXISTS "materials_select" ON materials;
DROP POLICY IF EXISTS "materials_insert" ON materials;
DROP POLICY IF EXISTS "availability_select" ON availability;
DROP POLICY IF EXISTS "availability_modify" ON availability;
DROP POLICY IF EXISTS "status_select" ON user_statuses;
DROP POLICY IF EXISTS "status_modify" ON user_statuses;
DROP POLICY IF EXISTS "bookings_access" ON bookings;
DROP POLICY IF EXISTS "wishes_select" ON birthday_wishes;
DROP POLICY IF EXISTS "wishes_insert" ON birthday_wishes;
DROP POLICY IF EXISTS "friend_requests_access" ON friend_requests;
DROP POLICY IF EXISTS "friendships_access" ON friendships;
DROP POLICY IF EXISTS "ratings_select" ON ratings;
DROP POLICY IF EXISTS "ratings_insert" ON ratings;
DROP POLICY IF EXISTS "subscriptions_own" ON subscriptions;
DROP POLICY IF EXISTS "messages_access" ON messages;
DROP POLICY IF EXISTS "chat_threads_access" ON chat_threads;
DROP POLICY IF EXISTS "calendar_own" ON calendar_events;
DROP POLICY IF EXISTS "attendance_own" ON attendance;
DROP POLICY IF EXISTS "feedback_insert" ON feedback;
DROP POLICY IF EXISTS "feedback_read_own" ON feedback;
DROP POLICY IF EXISTS "Users can view own blocks" ON user_blocks;
DROP POLICY IF EXISTS "Users can insert own blocks" ON user_blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON user_blocks;
DROP POLICY IF EXISTS "Users can create reports" ON user_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON user_reports;

-- Storage policies
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes" ON storage.objects;


-- ════════════════════════════════════════════════════════════
-- CREATE RLS POLICIES
-- ════════════════════════════════════════════════════════════

-- Students: anyone can read, only own profile can be modified
CREATE POLICY "students_select" ON students FOR SELECT USING (true);
CREATE POLICY "students_modify" ON students FOR ALL USING (id = auth.uid()::text);

-- Sessions: both participants can access
CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (
  student1_id = auth.uid()::text OR student2_id = auth.uid()::text
);

-- Notifications: users can only access their own
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid()::text);

-- Materials: everyone can read, only uploader can insert
CREATE POLICY "materials_select" ON materials FOR SELECT USING (true);
CREATE POLICY "materials_insert" ON materials FOR INSERT WITH CHECK (uploaded_by = auth.uid()::text);

-- Availability: public read, own write
CREATE POLICY "availability_select" ON availability FOR SELECT USING (true);
CREATE POLICY "availability_modify" ON availability FOR ALL USING (user_id = auth.uid()::text);

-- User statuses: public read, own write
CREATE POLICY "status_select" ON user_statuses FOR SELECT USING (true);
CREATE POLICY "status_modify" ON user_statuses FOR ALL USING (user_id = auth.uid()::text);

-- Bookings: both parties can access
CREATE POLICY "bookings_access" ON bookings FOR ALL USING (
  requester_id = auth.uid()::text OR target_id = auth.uid()::text
);

-- Birthday wishes: everyone can see, only sender can create
CREATE POLICY "wishes_select" ON birthday_wishes FOR SELECT USING (true);
CREATE POLICY "wishes_insert" ON birthday_wishes FOR INSERT WITH CHECK (from_user_id = auth.uid()::text);

-- Friend requests: both parties can access
CREATE POLICY "friend_requests_access" ON friend_requests FOR ALL USING (
  from_user_id = auth.uid()::text OR to_user_id = auth.uid()::text
);

-- Friendships: both parties can access
CREATE POLICY "friendships_access" ON friendships FOR ALL USING (
  user1_id = auth.uid()::text OR user2_id = auth.uid()::text
);

-- Ratings: everyone can read, only rater can create
CREATE POLICY "ratings_select" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (from_user_id = auth.uid()::text);

-- Subscriptions: users can only access their own
CREATE POLICY "subscriptions_own" ON subscriptions FOR ALL USING (user_id = auth.uid()::text);

-- Messages: both sender and receiver can access
CREATE POLICY "messages_access" ON messages FOR ALL USING (
  sender_id = auth.uid()::text OR receiver_id = auth.uid()::text
);

-- Chat threads: both parties can access
CREATE POLICY "chat_threads_access" ON chat_threads FOR ALL USING (
  user1_id = auth.uid()::text OR user2_id = auth.uid()::text
);

-- Calendar events: users can only access their own
CREATE POLICY "calendar_own" ON calendar_events FOR ALL USING (user_id = auth.uid()::text);

-- Attendance: users can only access their own
CREATE POLICY "attendance_own" ON attendance FOR ALL USING (user_id = auth.uid()::text);

-- OTP codes: NO policies = no client access (service role bypasses RLS)

-- Feedback: anyone can insert, users can read their own
CREATE POLICY "feedback_insert" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "feedback_read_own" ON feedback FOR SELECT USING (
  user_id = (SELECT auth.uid()::text)
);

-- User blocks: users can see/manage their own blocks
CREATE POLICY "Users can view own blocks" ON user_blocks
  FOR SELECT USING (blocker_id = auth.uid()::text);
CREATE POLICY "Users can insert own blocks" ON user_blocks
  FOR INSERT WITH CHECK (blocker_id = auth.uid()::text);
CREATE POLICY "Users can delete own blocks" ON user_blocks
  FOR DELETE USING (blocker_id = auth.uid()::text);

-- User reports: users can create and view their own reports
CREATE POLICY "Users can create reports" ON user_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid()::text);
CREATE POLICY "Users can view own reports" ON user_reports
  FOR SELECT USING (reporter_id = auth.uid()::text);


-- ════════════════════════════════════════════════════════════
-- STORAGE: materials bucket + policies
-- ════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access (download)
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'materials');

-- Authenticated users only for upload/update/delete
CREATE POLICY "Allow uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "Allow updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "Allow deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'materials' AND auth.role() = 'authenticated');


-- ════════════════════════════════════════════════════════════
-- SQL FUNCTIONS
-- ════════════════════════════════════════════════════════════

-- Average rating function (avoids fetching all ratings in JS)
CREATE OR REPLACE FUNCTION get_average_rating(target_user_id TEXT)
RETURNS FLOAT AS $$
  SELECT COALESCE(AVG(rating)::float, 0)
  FROM ratings
  WHERE to_user_id = target_user_id;
$$ LANGUAGE SQL STABLE;


-- ════════════════════════════════════════════════════════════
-- BACKFILL: Parse existing SVNIT emails → match_key
-- (safe to re-run, only updates rows with empty match_key)
-- ════════════════════════════════════════════════════════════
UPDATE students
SET
  match_key = CONCAT(
    SUBSTRING(SPLIT_PART(email, '@', 1), 1, 1),
    SUBSTRING(SPLIT_PART(email, '@', 1), 2, 2),
    SUBSTRING(SPLIT_PART(email, '@', 1), 4, 2)
  ),
  program_type = SUBSTRING(SPLIT_PART(email, '@', 1), 1, 1),
  batch_year = SUBSTRING(SPLIT_PART(email, '@', 1), 2, 2),
  dept_code = SUBSTRING(SPLIT_PART(email, '@', 1), 4, 2),
  roll_no = SUBSTRING(SPLIT_PART(email, '@', 1), 6, 3),
  profile_auto_filled = true
WHERE email LIKE '%@%.svnit.ac.in'
  AND SPLIT_PART(email, '@', 1) ~ '^[iupd][0-9]{2}[a-z]{2,3}[0-9]{3}$'
  AND (match_key IS NULL OR match_key = '');


-- ════════════════════════════════════════════════════════════
-- REALTIME: Enable realtime on messages table (for live chat)
-- ════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE messages;


-- ════════════════════════════════════════════════════════════
-- DONE! Verify with:
-- ════════════════════════════════════════════════════════════
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
