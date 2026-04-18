-- ============================================================
-- KLM Quiz App — Full Schema + RLS
-- Paste this into: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text not null unique,
  ladder_position int not null default 0,
  last_active_at timestamptz not null default now(),
  is_admin boolean not null default false,
  photo_url text,
  nationality char(2),
  status text not null default 'idle' check (status in ('idle', 'in_match')),
  created_at timestamptz not null default now()
);

-- Questions table
create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  topic text not null check (topic in (
    'klm_marketing', 'klm_brand_management', 'klm_brand_guide',
    'klm_tagless_luggage', 'virtual_humans', 'vibecoding'
  )),
  type text not null check (type in ('multiple_choice', 'true_false')),
  question_en text not null,
  options jsonb not null,
  correct_answer text not null,
  media_url text,
  p_score float not null default 0.5,
  rit_value float,
  times_asked int not null default 0,
  flagged boolean not null default false,
  approved boolean not null default true,
  ai_p_score_initial float,
  created_at timestamptz not null default now()
);

-- App settings table
create table if not exists public.app_settings (
  key text primary key,
  value text not null
);
insert into public.app_settings (key, value) values ('session_active', 'false')
  on conflict (key) do nothing;

-- Challenges table
create table if not exists public.challenges (
  id uuid primary key default uuid_generate_v4(),
  challenger_id uuid not null references public.users(id),
  challenged_id uuid not null references public.users(id),
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'declined', 'expired', 'completed')
  ),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Matches table
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges(id),
  player1_id uuid not null references public.users(id),
  player2_id uuid not null references public.users(id),
  winner_id uuid references public.users(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Match answers table
create table if not exists public.match_answers (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id),
  player_id uuid not null references public.users(id),
  question_id uuid not null references public.questions(id),
  answer text not null,
  time_ms int not null,
  is_correct boolean not null,
  points_awarded int not null default 0
);

-- Indexes
create index if not exists idx_challenges_challenged on public.challenges(challenged_id, status);
create index if not exists idx_matches_players on public.matches(player1_id, player2_id);
create index if not exists idx_match_answers on public.match_answers(match_id, player_id);
create index if not exists idx_questions_topic on public.questions(topic, p_score, flagged, approved);

-- Realtime
alter publication supabase_realtime add table public.challenges;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.users;

-- ============================================================
-- RLS Policies
-- ============================================================

alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.challenges enable row level security;
alter table public.matches enable row level security;
alter table public.match_answers enable row level security;
alter table public.app_settings enable row level security;

-- Users
create policy "users_select" on public.users for select to authenticated using (true);
create policy "users_update_own" on public.users for update to authenticated using (auth.uid() = id);

-- Questions
create policy "questions_select" on public.questions for select to authenticated
  using (approved = true and flagged = false);

-- Challenges
create policy "challenges_select" on public.challenges for select to authenticated
  using (auth.uid() = challenger_id or auth.uid() = challenged_id);
create policy "challenges_insert" on public.challenges for insert to authenticated
  with check (auth.uid() = challenger_id);
create policy "challenges_update" on public.challenges for update to authenticated
  using (auth.uid() = challenged_id or auth.uid() = challenger_id);

-- Matches
create policy "matches_select" on public.matches for select to authenticated
  using (auth.uid() = player1_id or auth.uid() = player2_id);

-- Match answers
create policy "match_answers_select" on public.match_answers for select to authenticated
  using (auth.uid() = player_id);
create policy "match_answers_insert" on public.match_answers for insert to authenticated
  with check (auth.uid() = player_id);

-- App settings
create policy "app_settings_select" on public.app_settings for select to authenticated using (true);

-- ============================================================
-- Storage bucket for avatars
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
