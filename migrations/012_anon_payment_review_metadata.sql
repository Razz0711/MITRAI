-- ============================================
-- Migration 012: Anonymous payment review metadata
-- Add reviewer labels for cookie-based admin approvals
-- ============================================

ALTER TABLE anon_payments
ADD COLUMN IF NOT EXISTS reviewed_by_label TEXT;

CREATE INDEX IF NOT EXISTS idx_anon_payments_transaction_id
ON anon_payments (transaction_id);
