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
-- Seed Data (SVNIT Demo Students)  
-- ============================================
INSERT INTO students (id, name, age, email, admission_number, city, country, timezone, preferred_language, department, current_study, institution, year_level, target_exam, target_date, strong_subjects, weak_subjects, currently_studying, upcoming_topics, learning_type, study_method, session_length, break_pattern, pace, available_days, available_times, sessions_per_week, session_type, study_style, communication, teaching_ability, accountability_need, video_call_comfort, short_term_goal, long_term_goal, study_hours_target, weekly_goals)
VALUES
('demo-1', 'Arjun Sharma', 20, 'arjun.sharma@svnit.ac.in', 'U23CS001', 'Surat', 'India', 'IST', 'English', 'Computer Science & Engineering', 'B.Tech CSE', 'SVNIT Surat', '3rd Year', 'Semester Exams', '2026-05-10', '["Data Structures","Algorithms","DBMS"]', '["Computer Networks","Operating Systems"]', 'Design and Analysis of Algorithms', '["Machine Learning","Compiler Design"]', 'practical', '["problems","discussion"]', '2hrs', 'pomodoro', 'fast', '["Monday","Wednesday","Friday","Saturday"]', '8PM-11PM IST', 4, 'both', 'strict', 'extrovert', 'can explain well', 'high', TRUE, 'Score 9+ SGPA this semester', 'Get placed in a top product company', 5, 'Complete 3 chapters and solve 150 DSA problems'),
('demo-2', 'Priya Patel', 19, 'priya.patel@svnit.ac.in', 'U24AI001', 'Surat', 'India', 'IST', 'English', 'Artificial Intelligence', 'B.Tech AI', 'SVNIT Surat', '2nd Year', 'Semester Exams', '2026-05-10', '["Linear Algebra","Python Programming","Probability & Statistics"]', '["Digital Logic","Discrete Mathematics"]', 'Machine Learning Fundamentals', '["Deep Learning","Natural Language Processing"]', 'visual', '["videos","notes"]', '1hr', 'pomodoro', 'medium', '["Monday","Tuesday","Thursday","Saturday"]', '7PM-10PM IST', 3, 'both', 'flexible', 'introvert', 'can explain well', 'medium', TRUE, 'Master ML algorithms before midsems', 'Research internship at a top AI lab', 4, 'Finish 2 ML modules and implement 3 algorithms'),
('demo-3', 'Rahul Verma', 20, 'rahul.verma@svnit.ac.in', 'U23ME001', 'Surat', 'India', 'IST', 'English', 'Mechanical Engineering', 'B.Tech Mechanical', 'SVNIT Surat', '3rd Year', 'GATE ME', '2027-02-01', '["Thermodynamics","Strength of Materials","Engineering Mechanics"]', '["Fluid Mechanics","Heat Transfer"]', 'Manufacturing Processes', '["Machine Design","Vibrations"]', 'practical', '["problems","notes"]', '2hrs', 'flexible', 'fast', '["Monday","Wednesday","Friday","Sunday"]', '6PM-9PM IST', 4, 'teaching', 'strict', 'extrovert', 'can explain well', 'high', TRUE, 'Complete Thermo & SOM revision by March', 'Crack GATE with under 500 AIR', 6, 'Solve 200 GATE PYQs and revise 2 chapters'),
('demo-4', 'Sneha Desai', 19, 'sneha.desai@svnit.ac.in', 'U24EC001', 'Surat', 'India', 'IST', 'English', 'Electronics & Communication', 'B.Tech ECE', 'SVNIT Surat', '2nd Year', 'Semester Exams', '2026-05-10', '["Circuit Theory","Signals & Systems"]', '["Electromagnetic Theory","Microprocessors"]', 'Analog Electronics', '["Digital Communication","VLSI Design"]', 'visual', '["notes","videos"]', '1hr', 'pomodoro', 'medium', '["Tuesday","Thursday","Saturday","Sunday"]', '5PM-8PM IST', 3, 'learning', 'flexible', 'introvert', 'average', 'high', FALSE, 'Clear all subjects with A grade', 'MS in VLSI from a top university', 4, 'Complete 2 chapters, solve tutorials, revise previous week'),
('demo-5', 'Aditya Joshi', 21, 'aditya.joshi@svnit.ac.in', 'U22CE001', 'Surat', 'India', 'IST', 'English', 'Civil Engineering', 'B.Tech Civil', 'SVNIT Surat', '4th Year', 'GATE CE', '2027-02-01', '["Structural Analysis","RCC Design","Geotechnical Engineering"]', '["Fluid Mechanics","Environmental Engineering"]', 'Steel Structures', '["Transportation Engineering","Estimation & Costing"]', 'reading', '["notes","problems"]', '2hrs', 'flexible', 'medium', '["Monday","Wednesday","Saturday"]', '9PM-11PM IST', 3, 'both', 'flexible', 'introvert', 'prefer learning', 'medium', TRUE, 'Master Structural Analysis for GATE', 'Clear GATE and join IIT for M.Tech', 5, 'Complete 2 chapters and solve 100 GATE problems'),
('demo-6', 'Kavya Mehta', 20, 'kavya.mehta@svnit.ac.in', 'U23MA001', 'Surat', 'India', 'IST', 'English', 'Integrated M.Sc. Mathematics', 'Integrated M.Sc. Mathematics', 'SVNIT Surat', '3rd Year', 'Semester Exams', '2026-05-10', '["Linear Algebra","Probability & Statistics","Numerical Analysis"]', '["Complex Analysis","Mechanics","Computer Networks"]', 'Ordinary Differential Equations', '["Complex Analysis","Continuum Mechanics","Metric Spaces"]', 'reading', '["notes","problems"]', '2hrs', 'pomodoro', 'medium', '["Monday","Wednesday","Friday","Sunday"]', '7PM-10PM IST', 4, 'both', 'strict', 'introvert', 'can explain well', 'high', TRUE, 'Score 9+ SGPA in ODE and Probability', 'Pursue research in Applied Mathematics or get into a quant firm', 5, 'Finish 3 chapters, solve problem sets, revise proofs'),
('demo-7', 'Rohan Tiwari', 19, 'rohan.tiwari@svnit.ac.in', 'U24EE001', 'Surat', 'India', 'IST', 'English', 'Electrical Engineering', 'B.Tech EE', 'SVNIT Surat', '2nd Year', 'Semester Exams', '2026-05-10', '["Circuit Analysis","Electrical Machines"]', '["Control Systems","Power Electronics"]', 'Network Theory', '["Power Systems","Instrumentation"]', 'practical', '["problems","videos"]', '1hr', 'flexible', 'medium', '["Monday","Wednesday","Friday"]', '8PM-10PM IST', 3, 'learning', 'flexible', 'introvert', 'average', 'medium', TRUE, 'Clear Control Systems with good marks', 'GATE EE or core company placement', 4, 'Solve tutorial sheets and practice numericals'),
('demo-8', 'Ananya Iyer', 20, 'ananya.iyer@svnit.ac.in', 'U23CH001', 'Surat', 'India', 'IST', 'English', 'Chemical Engineering', 'B.Tech Chemical', 'SVNIT Surat', '3rd Year', 'GATE CH', '2027-02-01', '["Chemical Reaction Engineering","Thermodynamics","Mass Transfer"]', '["Process Control","Heat Transfer"]', 'Process Dynamics and Control', '["Plant Design","Process Economics"]', 'reading', '["notes","problems"]', '2hrs', 'pomodoro', 'slow', '["Tuesday","Thursday","Saturday","Sunday"]', '7PM-10PM IST', 4, 'both', 'strict', 'extrovert', 'can explain well', 'high', TRUE, 'Complete CRE and Mass Transfer revision', 'Crack GATE CH and join IIT Bombay M.Tech', 5, 'Revise 2 chapters and solve GATE PYQs'),
('demo-9', 'Deepak Rathod', 19, 'deepak.rathod@svnit.ac.in', 'U24MA002', 'Surat', 'India', 'IST', 'English', 'Integrated M.Sc. Mathematics', 'Integrated M.Sc. Mathematics', 'SVNIT Surat', '2nd Year', 'Semester Exams', '2026-05-10', '["Elements of Analysis","Analytical Geometry","Discrete Mathematics"]', '["Numerical Analysis","Data Structures","Electromagnetics"]', 'Linear Algebra', '["Number Theory","Computational Life Science"]', 'practical', '["problems","discussion"]', '1hr', 'flexible', 'medium', '["Tuesday","Thursday","Saturday"]', '8PM-11PM IST', 3, 'learning', 'flexible', 'extrovert', 'average', 'medium', TRUE, 'Clear Numerical Analysis and Linear Algebra with good grades', 'GATE Mathematics or Data Science career', 4, 'Complete tutorial sheets and practice 50 problems per subject')
ON CONFLICT (id) DO NOTHING;
