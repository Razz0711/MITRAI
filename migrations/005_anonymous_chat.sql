-- ============================================
-- MitrAI - Migration 005: Anonymous Chat + Coupon/Pass System
-- Run in Supabase SQL Editor
-- ============================================

-- ════════════════════════════════════════════
-- 1. ANONYMOUS CHAT QUEUE (waiting to be matched)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS anon_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,   -- one queue entry at a time
  room_type TEXT NOT NULL CHECK (room_type IN ('vent', 'night_owl', 'confession', 'career', 'crush')),
  alias TEXT NOT NULL,            -- e.g. "CoolFox#4821"
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_queue_type ON anon_queue(room_type);

-- ════════════════════════════════════════════
-- 2. ANONYMOUS ROOMS (matched pairs)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS anon_rooms (
  id TEXT PRIMARY KEY,
  room_type TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revealed', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_anon_rooms_status ON anon_rooms(status);

-- ════════════════════════════════════════════
-- 3. ANONYMOUS ROOM MEMBERS (2 per room)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS anon_room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  reveal_consent BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_anon_room_members_room ON anon_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_anon_room_members_user ON anon_room_members(user_id);

-- ════════════════════════════════════════════
-- 4. ANONYMOUS MESSAGES
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS anon_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_messages_room ON anon_messages(room_id);

-- ════════════════════════════════════════════
-- 5. REPORTS & BLOCKS
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS anon_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reported_user_id TEXT NOT NULL,
  message_id TEXT DEFAULT '',
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_reports_status ON anon_reports(status);

CREATE TABLE IF NOT EXISTS anon_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_anon_blocks_blocker ON anon_blocks(blocker_id);

-- ════════════════════════════════════════════
-- 6. ANON BANS (temp or permanent)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS anon_bans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  reason TEXT DEFAULT '',
  expires_at TIMESTAMPTZ,       -- NULL = permanent
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_bans_user ON anon_bans(user_id);

-- ════════════════════════════════════════════
-- 7. ANON PASSES (access tokens — paid/coupon)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS anon_passes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('weekly', 'monthly', 'semester')),
  price INT NOT NULL DEFAULT 0,         -- price in INR paise (1900 = ₹19)
  source TEXT DEFAULT 'coupon',         -- 'coupon' | 'payment'
  coupon_code TEXT DEFAULT '',
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_passes_user ON anon_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_anon_passes_expires ON anon_passes(expires_at);

-- ════════════════════════════════════════════
-- 8. ANON COUPONS (admin-generated codes)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS anon_coupons (
  code TEXT PRIMARY KEY,
  plan TEXT NOT NULL CHECK (plan IN ('weekly', 'monthly', 'semester')),
  max_uses INT DEFAULT 1,
  used_count INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ              -- NULL = never expires
);

-- ════════════════════════════════════════════
-- 9. RLS POLICIES
-- ════════════════════════════════════════════
ALTER TABLE anon_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE anon_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE anon_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE anon_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE anon_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE anon_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE anon_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE anon_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE anon_coupons ENABLE ROW LEVEL SECURITY;

-- Queue: own only
CREATE POLICY "anon_queue_own" ON anon_queue FOR ALL USING (user_id = auth.uid()::text);

-- Rooms: members can read
CREATE POLICY "anon_rooms_read" ON anon_rooms FOR SELECT USING (
  EXISTS (SELECT 1 FROM anon_room_members WHERE room_id = anon_rooms.id AND user_id = auth.uid()::text)
);

-- Room members: members of same room
CREATE POLICY "anon_room_members_read" ON anon_room_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM anon_room_members arm WHERE arm.room_id = anon_room_members.room_id AND arm.user_id = auth.uid()::text)
);
CREATE POLICY "anon_room_members_own" ON anon_room_members FOR UPDATE USING (user_id = auth.uid()::text);

-- Messages: room members can read/insert
CREATE POLICY "anon_messages_read" ON anon_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM anon_room_members WHERE room_id = anon_messages.room_id AND user_id = auth.uid()::text)
);
CREATE POLICY "anon_messages_insert" ON anon_messages FOR INSERT WITH CHECK (sender_id = auth.uid()::text);

-- Reports: own only
CREATE POLICY "anon_reports_own" ON anon_reports FOR INSERT WITH CHECK (reporter_id = auth.uid()::text);

-- Blocks: own only
CREATE POLICY "anon_blocks_own" ON anon_blocks FOR ALL USING (blocker_id = auth.uid()::text);

-- Bans: read own
CREATE POLICY "anon_bans_read" ON anon_bans FOR SELECT USING (user_id = auth.uid()::text);

-- Passes: read own
CREATE POLICY "anon_passes_own" ON anon_passes FOR SELECT USING (user_id = auth.uid()::text);

-- Coupons: public read (for redemption)
CREATE POLICY "anon_coupons_read" ON anon_coupons FOR SELECT USING (true);

-- Enable realtime on anon_messages for live anonymous chat
ALTER PUBLICATION supabase_realtime ADD TABLE anon_messages;

-- ════════════════════════════════════════════
-- 10. ALIAS WORD POOL (fun anonymous names)
-- ════════════════════════════════════════════
-- We store alias words in app code instead of DB for simplicity.
-- See src/lib/anon-aliases.ts for the word pool.
