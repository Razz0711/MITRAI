-- ============================================
-- 028_arya_selfie_rotation.sql
-- Modify arya_selfies table to support multiple
-- selfies per user (rotation) with selfie_id tracking.
-- ============================================

-- 1. Add selfie_id column to track which catalog selfie was sent
ALTER TABLE public.arya_selfies
  ADD COLUMN IF NOT EXISTS selfie_id TEXT;

-- 2. Drop the old UNIQUE(user_id) constraint so users can receive multiple selfies
-- (The constraint name may vary; this targets the default naming convention)
ALTER TABLE public.arya_selfies
  DROP CONSTRAINT IF EXISTS arya_selfies_user_id_key;

-- 3. Add an index for fast lookup of seen selfies per user
CREATE INDEX IF NOT EXISTS idx_arya_selfies_user_selfie
  ON public.arya_selfies(user_id, selfie_id);
