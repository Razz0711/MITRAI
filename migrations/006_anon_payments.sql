-- ============================================
-- Migration 006: Anonymous Chat Payments
-- UPI-based payment flow with admin approval
-- ============================================

-- Payments table (tracks UPI payment submissions)
CREATE TABLE IF NOT EXISTS anon_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('weekly', 'monthly', 'semester')),
  amount INTEGER NOT NULL,
  transaction_id TEXT NOT NULL,
  upi_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT REFERENCES students(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_payments_user ON anon_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_anon_payments_status ON anon_payments(status);
CREATE INDEX IF NOT EXISTS idx_anon_payments_created ON anon_payments(created_at DESC);

-- RLS
ALTER TABLE anon_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON anon_payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own payments"
  ON anon_payments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Service role can do everything (admin operations via server)
-- No additional policy needed — supabase service role bypasses RLS

-- ============================================
-- Insert some default coupon codes for testing
-- These are one-time use monthly coupons
-- ============================================

INSERT INTO anon_coupons (code, plan, max_uses, used_count, active, created_by)
VALUES 
  ('SVNIT2026', 'monthly', 50, 0, true, '00000000-0000-0000-0000-000000000000'),
  ('MITRAI-FREE', 'weekly', 100, 0, true, '00000000-0000-0000-0000-000000000000'),
  ('ANONCHAT', 'monthly', 25, 0, true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (code) DO NOTHING;
