-- ============================================
-- MitrRAI - Expert Therapists System
-- Migration 033
-- Tables: experts, expert_availability,
--          expert_bookings, expert_reviews
-- ============================================

-- 1. Experts table
create table if not exists experts (
  id uuid default gen_random_uuid() primary key,

  -- Basic info
  name text not null,
  title text not null default 'Counselling Psychologist',
  gender text check (gender in ('male', 'female')) not null default 'female',
  about text,
  avatar_url text,

  -- Experience
  experience_years integer not null default 1,
  qualifications jsonb not null default '[]'::jsonb,
  languages jsonb not null default '["English", "Hindi"]'::jsonb,
  expertise jsonb not null default '[]'::jsonb,
  specializations jsonb not null default '[]'::jsonb,
  awards jsonb not null default '[]'::jsonb,
  work_experience jsonb not null default '[]'::jsonb,

  -- Booking config
  price_per_session integer default 0,        -- in INR, 0 = free
  session_duration_mins integer default 45,
  booking_url text,                           -- external Meet/Zoom link template
  max_bookings_per_day integer default 5,

  -- Ratings (cached aggregates — updated by trigger/cron)
  rating numeric(2,1) default 0,
  review_count integer default 0,

  -- Status
  is_active boolean default true,
  is_featured boolean default false,
  sort_order integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_experts_active on experts(is_active);
create index if not exists idx_experts_rating on experts(rating desc);

-- 2. Expert availability (weekly recurring slots)
create table if not exists expert_availability (
  id uuid default gen_random_uuid() primary key,
  expert_id uuid references experts(id) on delete cascade not null,

  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Sun, 6=Sat
  start_time time not null,
  end_time time not null,
  is_active boolean default true,

  created_at timestamptz default now(),

  constraint valid_time_range check (start_time < end_time)
);

create index if not exists idx_expert_availability_expert on expert_availability(expert_id);

-- 3. Expert bookings
create table if not exists expert_bookings (
  id uuid default gen_random_uuid() primary key,
  expert_id uuid references experts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,

  booking_date date not null,
  start_time time not null,
  end_time time not null,

  status text default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  session_mode text default 'video' check (session_mode in ('video', 'audio', 'chat')),
  meeting_link text,                -- Google Meet / Zoom link
  notes text,                       -- user's notes for the session
  cancellation_reason text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_expert_bookings_expert on expert_bookings(expert_id);
create index if not exists idx_expert_bookings_user on expert_bookings(user_id);
create index if not exists idx_expert_bookings_date on expert_bookings(booking_date);
-- Prevent double-booking same slot
create unique index if not exists idx_expert_bookings_unique_slot
  on expert_bookings(expert_id, booking_date, start_time)
  where status = 'confirmed';

-- 4. Expert reviews
create table if not exists expert_reviews (
  id uuid default gen_random_uuid() primary key,
  expert_id uuid references experts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,

  rating integer not null check (rating between 1 and 5),
  review_text text,

  created_at timestamptz default now(),

  -- One review per user per expert
  constraint unique_user_expert_review unique (expert_id, user_id)
);

create index if not exists idx_expert_reviews_expert on expert_reviews(expert_id);

-- 5. RLS Policies (drop first to make migration idempotent)
-- Experts: public read, admin write
alter table experts enable row level security;

drop policy if exists "Anyone can read active experts" on experts;
create policy "Anyone can read active experts"
  on experts for select using (is_active = true);

drop policy if exists "Service role full access to experts" on experts;
create policy "Service role full access to experts"
  on experts for all using (true) with check (true);

-- Availability: public read
alter table expert_availability enable row level security;

drop policy if exists "Anyone can read availability" on expert_availability;
create policy "Anyone can read availability"
  on expert_availability for select using (true);

drop policy if exists "Service role full access to availability" on expert_availability;
create policy "Service role full access to availability"
  on expert_availability for all using (true) with check (true);

-- Bookings: users see own, service role sees all
alter table expert_bookings enable row level security;

drop policy if exists "Users can read own bookings" on expert_bookings;
create policy "Users can read own bookings"
  on expert_bookings for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own bookings" on expert_bookings;
create policy "Users can insert own bookings"
  on expert_bookings for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own bookings" on expert_bookings;
create policy "Users can update own bookings"
  on expert_bookings for update using (auth.uid() = user_id);

drop policy if exists "Service role full access to bookings" on expert_bookings;
create policy "Service role full access to bookings"
  on expert_bookings for all using (true) with check (true);

-- Reviews: public read, auth insert
alter table expert_reviews enable row level security;

drop policy if exists "Anyone can read reviews" on expert_reviews;
create policy "Anyone can read reviews"
  on expert_reviews for select using (true);

drop policy if exists "Users can insert own reviews" on expert_reviews;
create policy "Users can insert own reviews"
  on expert_reviews for insert with check (auth.uid() = user_id);

drop policy if exists "Service role full access to reviews" on expert_reviews;
create policy "Service role full access to reviews"
  on expert_reviews for all using (true) with check (true);

-- 6. Function to update expert rating cache
create or replace function update_expert_rating()
returns trigger as $$
begin
  update experts set
    rating = coalesce((select round(avg(rating)::numeric, 1) from expert_reviews where expert_id = coalesce(new.expert_id, old.expert_id)), 0),
    review_count = (select count(*) from expert_reviews where expert_id = coalesce(new.expert_id, old.expert_id)),
    updated_at = now()
  where id = coalesce(new.expert_id, old.expert_id);
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_update_expert_rating on expert_reviews;
create trigger trg_update_expert_rating
  after insert or update or delete on expert_reviews
  for each row execute function update_expert_rating();

