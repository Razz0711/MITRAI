-- ============================================
-- Migration 030: Institution-based Campus Feed
-- Add institution column to campus_posts for
-- college-specific feed filtering
-- ============================================

-- 1. Add institution column to campus_posts
ALTER TABLE campus_posts
ADD COLUMN IF NOT EXISTS institution TEXT DEFAULT NULL;

-- 2. Create index for institution-based queries
CREATE INDEX IF NOT EXISTS idx_campus_posts_institution
ON campus_posts(institution);

-- 3. Backfill existing posts with institution from students table
UPDATE campus_posts cp
SET institution = (
  SELECT s.institution
  FROM students s
  WHERE s.id = cp.user_id::text
  LIMIT 1
)
WHERE cp.institution IS NULL;
