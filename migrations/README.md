# ============================================
# MitrAI - Database Migration System
# ============================================
#
# Migrations are stored in the /migrations folder as numbered SQL files.
# Run them in order in the Supabase SQL Editor.
#
# Migration files:
#   001_add_match_key.sql        — Batch matching columns + backfill
#   002_user_blocks_reports.sql  — User blocking & reporting tables
#   003_sessions_analytics.sql   — Sessions table for analytics
#
# How to run:
#   1. Open Supabase Dashboard → SQL Editor
#   2. Copy each migration SQL file
#   3. Run in order (001, 002, 003, ...)
#   4. Each migration is idempotent (safe to re-run)
#
# For automated migrations, consider using:
#   - supabase CLI: `supabase db push`
#   - dbmate, Flyway, or similar migration tools
