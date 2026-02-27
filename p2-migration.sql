-- ============================================
-- MitrAI P2 Migration — Run in Supabase SQL Editor
-- Safe to re-run (uses DROP IF EXISTS + IF NOT EXISTS)
-- ============================================

-- ============================================
-- PART 1: Add DOB columns to students table (S5 fix)
-- ============================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS show_birthday BOOLEAN DEFAULT TRUE;

-- ============================================
-- PART 2: Enable RLS on all tables
-- ============================================
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

-- ============================================
-- PART 3: Drop existing policies (safe cleanup for re-runs)
-- ============================================
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

-- Storage policies
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes" ON storage.objects;

-- ============================================
-- PART 4: Create RLS policies
-- ============================================

-- Students: anyone can read profiles, only own profile can be modified
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

-- ============================================
-- PART 5: Storage bucket & policies
-- ============================================
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

-- ============================================
-- PART 6: Performance indexes
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
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);

-- ============================================
-- PART 7: SQL function for average rating
-- ============================================
CREATE OR REPLACE FUNCTION get_average_rating(target_user_id TEXT)
RETURNS FLOAT AS $$
  SELECT COALESCE(AVG(rating)::float, 0)
  FROM ratings
  WHERE to_user_id = target_user_id;
$$ LANGUAGE SQL STABLE;
