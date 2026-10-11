-- Personalized learning paths for GoldenGuide, built without AI.
--
-- * lessons get a difficulty level so recommendations can match a learner's
--   knowledge and move up or down as their quiz scores change.
-- * learning_preferences holds each person's onboarding answers. For a
--   learner it's their learning plan (topics, knowledge level, goals), which
--   only they can change; connected caregivers can read it. For a caregiver
--   it's the topics they'd like to suggest to whoever connects with them.
-- * topic_suggestions lets a connected caregiver suggest a topic. Nothing
--   changes in the learner's plan until the learner adds it themselves; either
--   of them can remove a suggestion. When a learner connects to a caregiver,
--   the caregiver's onboarding topics are turned into suggestions.
--
-- Topic, level and goal ids match the lists in src/lib/learning-plan.ts. If
-- those lists change, update the check constraints in a new migration.

-- ---------------------------------------------------------------------------
-- lesson difficulty
-- ---------------------------------------------------------------------------
alter table public.lessons
  add column if not exists level text not null default 'beginner'
    check (level in ('beginner', 'intermediate', 'advanced'));

-- ---------------------------------------------------------------------------
-- learning preferences (one row per person)
-- ---------------------------------------------------------------------------
create table if not exists public.learning_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  topics text[] not null default '{}'
    check (topics <@ array['budgeting', 'bills', 'scams', 'savings', 'loans', 'investing']::text[]),
  level text not null default 'beginner'
    check (level in ('beginner', 'intermediate', 'advanced')),
  goals text[] not null default '{}'
    check (goals <@ array['avoid_scams', 'manage_bills', 'save_more', 'understand_credit', 'make_money_last', 'feel_confident']::text[]),
  updated_at timestamptz not null default now()
);

alter table public.learning_preferences enable row level security;

drop trigger if exists learning_preferences_set_updated_at on public.learning_preferences;
create trigger learning_preferences_set_updated_at
  before update on public.learning_preferences
  for each row execute function public.set_updated_at();

-- user_id is the primary key, so the policies below are already indexed.
create policy "learning_preferences_select_own" on public.learning_preferences
  for select to authenticated
  using (user_id = auth.uid());

create policy "learning_preferences_select_connected_caregiver" on public.learning_preferences
  for select to authenticated
  using (
    exists (
      select 1 from public.connections c
      where c.caregiver_id = auth.uid()
        and c.care_recipient_id = learning_preferences.user_id
    )
  );

create policy "learning_preferences_insert_own" on public.learning_preferences
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "learning_preferences_update_own" on public.learning_preferences
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- caregiver topic suggestions
-- ---------------------------------------------------------------------------
create table if not exists public.topic_suggestions (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  care_recipient_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null
    check (topic in ('budgeting', 'bills', 'scams', 'savings', 'loans', 'investing')),
  note text not null default '' check (length(note) <= 200),
  created_at timestamptz not null default now(),
  unique (caregiver_id, care_recipient_id, topic)
);

alter table public.topic_suggestions enable row level security;

-- The unique constraint's index leads with caregiver_id.
create index if not exists topic_suggestions_recipient_idx
  on public.topic_suggestions (care_recipient_id, created_at desc);

create policy "topic_suggestions_select_caregiver" on public.topic_suggestions
  for select to authenticated
  using (caregiver_id = auth.uid());

create policy "topic_suggestions_select_recipient" on public.topic_suggestions
  for select to authenticated
  using (care_recipient_id = auth.uid());

create policy "topic_suggestions_insert_connected_caregiver" on public.topic_suggestions
  for insert to authenticated
  with check (
    caregiver_id = auth.uid()
    and exists (
      select 1 from public.connections c
      where c.caregiver_id = auth.uid()
        and c.care_recipient_id = topic_suggestions.care_recipient_id
    )
  );

create policy "topic_suggestions_delete_caregiver" on public.topic_suggestions
  for delete to authenticated
  using (caregiver_id = auth.uid());

create policy "topic_suggestions_delete_recipient" on public.topic_suggestions
  for delete to authenticated
  using (care_recipient_id = auth.uid());

-- When a learner connects, turn the caregiver's onboarding topics into
-- suggestions, skipping topics already in the learner's plan. Runs as definer
-- because the learner (not the caregiver) is the one creating the connection.
create or replace function public.suggest_caregiver_topics_on_connect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.topic_suggestions (caregiver_id, care_recipient_id, topic)
  select new.caregiver_id, new.care_recipient_id, t.topic
  from public.learning_preferences p
  cross join lateral unnest(p.topics) as t(topic)
  where p.user_id = new.caregiver_id
    and not exists (
      select 1 from public.learning_preferences lp
      where lp.user_id = new.care_recipient_id
        and t.topic = any (lp.topics)
    )
  on conflict (caregiver_id, care_recipient_id, topic) do nothing;
  return new;
end;
$$;

revoke all on function public.suggest_caregiver_topics_on_connect() from public, anon, authenticated;

drop trigger if exists connections_suggest_caregiver_topics on public.connections;
create trigger connections_suggest_caregiver_topics
  after insert on public.connections
  for each row execute function public.suggest_caregiver_topics_on_connect();
