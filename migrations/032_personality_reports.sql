-- ============================================
-- MitrRAI - Self Awareness Test / Personality Reports
-- Migration 032
-- ============================================

-- 1. Create personality_reports table
create table if not exists personality_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,

  report_number integer default 1,

  openness integer not null,
  conscientiousness integer not null,
  extraversion integer not null,
  agreeableness integer not null,
  neuroticism integer not null,

  raw_answers jsonb not null,
  full_report jsonb not null,
  arya_context jsonb not null,

  created_at timestamptz default now(),

  constraint valid_openness check (openness between 0 and 100),
  constraint valid_conscientiousness check (conscientiousness between 0 and 100),
  constraint valid_extraversion check (extraversion between 0 and 100),
  constraint valid_agreeableness check (agreeableness between 0 and 100),
  constraint valid_neuroticism check (neuroticism between 0 and 100)
);

create index if not exists idx_personality_reports_user on personality_reports(user_id);
create index if not exists idx_personality_reports_created on personality_reports(created_at);

-- 2. Add personality columns to students table
alter table students add column if not exists
  has_taken_personality_test boolean default false;

alter table students add column if not exists
  latest_personality_report_id uuid;

alter table students add column if not exists
  personality_test_count integer default 0;

alter table students add column if not exists
  last_personality_test_date timestamptz;

-- 3. RLS policies
alter table personality_reports enable row level security;

-- Users can read their own reports
create policy "Users can read own personality reports"
  on personality_reports for select
  using (auth.uid() = user_id);

-- Users can insert their own reports
create policy "Users can insert own personality reports"
  on personality_reports for insert
  with check (auth.uid() = user_id);

-- Service role can do everything (for API routes)
create policy "Service role full access to personality_reports"
  on personality_reports for all
  using (true)
  with check (true);
