-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.users (
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
create table public.questions (
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
create table public.app_settings (
  key text primary key,
  value text not null
);
insert into public.app_settings (key, value) values ('session_active', 'false');

-- Challenges table
create table public.challenges (
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
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges(id),
  player1_id uuid not null references public.users(id),
  player2_id uuid not null references public.users(id),
  winner_id uuid references public.users(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Match answers table
create table public.match_answers (
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
create index on public.challenges(challenged_id, status);
create index on public.matches(player1_id, player2_id);
create index on public.match_answers(match_id, player_id);
create index on public.questions(topic, p_score, flagged, approved);

-- Realtime
alter publication supabase_realtime add table public.challenges;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.users;
