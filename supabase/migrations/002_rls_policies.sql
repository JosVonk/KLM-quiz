-- Enable RLS
alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.challenges enable row level security;
alter table public.matches enable row level security;
alter table public.match_answers enable row level security;

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

-- App settings: anyone authenticated can read
create policy "app_settings_select" on public.app_settings for select to authenticated using (true);
alter table public.app_settings enable row level security;
