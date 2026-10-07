-- AI-assisted content for GoldenGuide admins. Lessons gain structured
-- sections (examples, key takeaways, practice questions) alongside the
-- existing body, and both lessons and practice scenarios track whether they
-- were AI-generated and whether an admin has approved them. AI-generated
-- content can never be published without an approval, which the database
-- enforces with a check constraint so no code path can skip the review step.
--
-- No new tables are added; the existing admin-only RLS policies on lessons
-- and practice_scenarios already cover the new columns.

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
alter table public.lessons
  add column if not exists examples jsonb not null default '[]'::jsonb
    check (jsonb_typeof(examples) = 'array'),
  add column if not exists key_takeaways jsonb not null default '[]'::jsonb
    check (jsonb_typeof(key_takeaways) = 'array'),
  add column if not exists practice_questions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(practice_questions) = 'array'),
  add column if not exists ai_generated boolean not null default false,
  add column if not exists ai_review_notes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(ai_review_notes) = 'array'),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users (id) on delete set null;

alter table public.lessons drop constraint if exists lessons_ai_publish_requires_approval;
alter table public.lessons add constraint lessons_ai_publish_requires_approval
  check (not ai_generated or status = 'draft' or approved_at is not null);

-- ---------------------------------------------------------------------------
-- practice scenarios
-- ---------------------------------------------------------------------------
alter table public.practice_scenarios
  add column if not exists lesson_id uuid references public.lessons (id) on delete set null,
  add column if not exists ai_generated boolean not null default false,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users (id) on delete set null;

create index if not exists practice_scenarios_lesson_idx on public.practice_scenarios (lesson_id);

alter table public.practice_scenarios drop constraint if exists practice_scenarios_ai_publish_requires_approval;
alter table public.practice_scenarios add constraint practice_scenarios_ai_publish_requires_approval
  check (not ai_generated or status = 'draft' or approved_at is not null);

-- ---------------------------------------------------------------------------
-- approved_by is always the admin who set approved_at, never client-supplied
-- ---------------------------------------------------------------------------
create or replace function public.set_approved_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.approved_at is null then
    new.approved_by = null;
  elsif tg_op = 'INSERT' or old.approved_at is null then
    new.approved_by = auth.uid();
  else
    new.approved_by = old.approved_by;
  end if;
  return new;
end;
$$;

drop trigger if exists lessons_set_approved_by on public.lessons;
create trigger lessons_set_approved_by
  before insert or update on public.lessons
  for each row execute function public.set_approved_by();

drop trigger if exists practice_scenarios_set_approved_by on public.practice_scenarios;
create trigger practice_scenarios_set_approved_by
  before insert or update on public.practice_scenarios
  for each row execute function public.set_approved_by();
