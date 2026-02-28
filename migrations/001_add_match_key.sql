-- ============================================
-- MitrAI - Smart Email Parsing & Batch Matching
-- Migration: Add match_key columns to students table
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)
-- ============================================

-- 1. Add new columns
ALTER TABLE students ADD COLUMN IF NOT EXISTS match_key VARCHAR(10) DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS program_type VARCHAR(1) DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS batch_year VARCHAR(2) DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS dept_code VARCHAR(3) DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS roll_no VARCHAR(5) DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS dept_known BOOLEAN DEFAULT true;
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_auto_filled BOOLEAN DEFAULT false;

-- 2. Create index on match_key for fast batch queries
CREATE INDEX IF NOT EXISTS idx_students_match_key ON students(match_key);

-- 3. Backfill existing students by parsing their email
-- Email format: [type][batch][dept][roll]@[subdomain].svnit.ac.in
-- e.g. i22ma038@amhd.svnit.ac.in → match_key = 'i22ma'
UPDATE students
SET
  match_key = CONCAT(
    SUBSTRING(SPLIT_PART(email, '@', 1), 1, 1),   -- type (i/u/p/d)
    SUBSTRING(SPLIT_PART(email, '@', 1), 2, 2),    -- batch year (22)
    SUBSTRING(SPLIT_PART(email, '@', 1), 4, 2)     -- dept code (ma)
  ),
  program_type = SUBSTRING(SPLIT_PART(email, '@', 1), 1, 1),
  batch_year = SUBSTRING(SPLIT_PART(email, '@', 1), 2, 2),
  dept_code = SUBSTRING(SPLIT_PART(email, '@', 1), 4, 2),
  roll_no = SUBSTRING(SPLIT_PART(email, '@', 1), 6, 3),
  profile_auto_filled = true
WHERE email LIKE '%@%.svnit.ac.in'
  AND SPLIT_PART(email, '@', 1) ~ '^[iupd][0-9]{2}[a-z]{2,3}[0-9]{3}$'
  AND (match_key IS NULL OR match_key = '');

-- 4. Verify backfill results
SELECT match_key, COUNT(*) AS students
FROM students
WHERE match_key IS NOT NULL AND match_key != ''
GROUP BY match_key
ORDER BY match_key;
