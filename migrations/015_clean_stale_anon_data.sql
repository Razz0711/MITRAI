-- ============================================
-- Migration 015: Clean ALL stale anon data
-- Removes stale active rooms, old messages, old queue entries
-- ============================================

-- 1. Delete ALL messages (should be ephemeral, none should exist)
DELETE FROM anon_messages;

-- 2. Delete ALL room members from rooms older than 1 hour
DELETE FROM anon_room_members WHERE room_id IN (
  SELECT id FROM anon_rooms WHERE created_at < now() - interval '1 hour'
);

-- 3. Delete ALL rooms older than 1 hour (stale active rooms)
DELETE FROM anon_rooms WHERE created_at < now() - interval '1 hour';

-- 4. Delete ALL queue entries older than 10 minutes
DELETE FROM anon_queue WHERE joined_at < now() - interval '10 minutes';

-- 5. Also clean any orphan room members (no matching room)
DELETE FROM anon_room_members WHERE room_id NOT IN (SELECT id FROM anon_rooms);
