-- Learning progress for GoldenGuide. Each time a learner finishes a lesson we
-- record it with their quiz score, so learners can see their own progress and
-- connected caregivers can see a weekly summary. Learners can only record
-- their own completions of published lessons; completions can't be edited or
-- deleted by users. Caregivers get read access to the progress and practice
-- activity of the learners they're connected to, and nothing else.

-- ---------------------------------------------------------------------------
-- lesson completions
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  correct_count integer not null default 0 check (correct_count >= 0),
  question_count integer not null default 0 check (question_count >= 0),
  completed_at timestamptz not null default now(),
  check (correct_count <= question_count)
);

alter table public.lesson_completions enable row level security;

create index if not exists lesson_completions_user_completed_idx
  on public.lesson_completions (user_id, completed_at desc);
create index if not exists lesson_completions_lesson_idx
  on public.lesson_completions (lesson_id);

create policy "lesson_completions_select_own" on public.lesson_completions
  for select to authenticated
  using (user_id = auth.uid());

create policy "lesson_completions_select_connected_caregiver" on public.lesson_completions
  for select to authenticated
  using (
    exists (
      select 1 from public.connections c
      where c.caregiver_id = auth.uid()
        and c.care_recipient_id = lesson_completions.user_id
    )
  );

create policy "lesson_completions_insert_own" on public.lesson_completions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_completions.lesson_id
        and l.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- usage events: let learners and their caregivers read practice activity
-- (inserts were already allowed; usage_events_user_idx covers user_id)
-- ---------------------------------------------------------------------------
create policy "usage_events_select_own" on public.usage_events
  for select to authenticated
  using (user_id = auth.uid());

create policy "usage_events_select_connected_caregiver" on public.usage_events
  for select to authenticated
  using (
    exists (
      select 1 from public.connections c
      where c.caregiver_id = auth.uid()
        and c.care_recipient_id = usage_events.user_id
    )
  );
