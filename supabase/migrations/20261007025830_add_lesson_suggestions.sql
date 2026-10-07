-- Caregiver-suggested lessons. A caregiver can suggest a published lesson
-- (with an optional short note) to a learner they're connected to; the
-- learner sees it on their Home page until they finish that lesson. Only the
-- caregiver who made a suggestion can remove it, and nobody can edit one.

create table if not exists public.lesson_suggestions (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  care_recipient_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  note text not null default '' check (length(note) <= 200),
  created_at timestamptz not null default now()
);

alter table public.lesson_suggestions enable row level security;

create index if not exists lesson_suggestions_caregiver_idx
  on public.lesson_suggestions (caregiver_id);
create index if not exists lesson_suggestions_recipient_idx
  on public.lesson_suggestions (care_recipient_id, created_at desc);
create index if not exists lesson_suggestions_lesson_idx
  on public.lesson_suggestions (lesson_id);

create policy "lesson_suggestions_select_caregiver" on public.lesson_suggestions
  for select to authenticated
  using (caregiver_id = auth.uid());

create policy "lesson_suggestions_select_recipient" on public.lesson_suggestions
  for select to authenticated
  using (care_recipient_id = auth.uid());

create policy "lesson_suggestions_insert_connected_caregiver" on public.lesson_suggestions
  for insert to authenticated
  with check (
    caregiver_id = auth.uid()
    and exists (
      select 1 from public.connections c
      where c.caregiver_id = auth.uid()
        and c.care_recipient_id = lesson_suggestions.care_recipient_id
    )
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_suggestions.lesson_id
        and l.status = 'published'
    )
  );

create policy "lesson_suggestions_delete_caregiver" on public.lesson_suggestions
  for delete to authenticated
  using (caregiver_id = auth.uid());
