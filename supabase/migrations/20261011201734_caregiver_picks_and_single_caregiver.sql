-- Two rule changes:
--
-- 1. A learner has at most one caregiver. Enforced with a unique index on
--    connections.care_recipient_id, plus a friendly error from the
--    connection trigger before the index would reject it.
--
-- 2. On the Free plan, a learner whose caregiver manages them waits for the
--    caregiver's picks: with no picks for today, they can't finish lessons.
--    Learners without a managing caregiver (learning alone, or paused on
--    their caregiver's Free plan) keep up to 5 lessons a day of their own.
--    Family learners are unchanged (unlimited).

-- ---------------------------------------------------------------------------
-- one caregiver per learner
-- ---------------------------------------------------------------------------
create unique index if not exists connections_one_caregiver_per_learner
  on public.connections (care_recipient_id);

-- The unique index covers lookups by care_recipient_id.
drop index if exists public.connections_care_recipient_id_idx;

create or replace function public.enforce_connection_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Reconnecting an existing pair is a no-op handled by the unique constraint.
  if exists (
    select 1 from public.connections c
    where c.caregiver_id = new.caregiver_id and c.care_recipient_id = new.care_recipient_id
  ) then
    return new;
  end if;

  if exists (
    select 1 from public.connections c where c.care_recipient_id = new.care_recipient_id
  ) then
    raise exception 'You''re already connected with a caregiver. To switch, remove that connection first.';
  end if;

  if (select count(*) from public.connections c where c.caregiver_id = new.caregiver_id)
     >= public.caregiver_learner_limit(new.caregiver_id) then
    raise exception 'This caregiver can''t connect with anyone else right now. Please let them know.';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- managed Free learners wait for their caregiver's picks
-- ---------------------------------------------------------------------------
create or replace function public.learner_is_managed(p_learner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.connections c
    where c.care_recipient_id = p_learner
      and public.caregiver_manages(c.caregiver_id, p_learner)
  );
$$;

revoke all on function public.learner_is_managed(uuid) from public, anon, authenticated;

create or replace function public.enforce_daily_lesson_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := public.user_today(new.user_id);
begin
  -- The server clock decides which day a completion counts toward.
  new.completed_at := now();

  if public.learner_has_family(new.user_id) then
    return new;
  end if;

  -- With a caregiver (or any picks for today), only picked lessons count.
  if (
      public.learner_is_managed(new.user_id)
      or exists (
        select 1 from public.daily_lessons d
        where d.care_recipient_id = new.user_id and d.day = v_today
      )
    )
    and not exists (
      select 1 from public.daily_lessons d
      where d.care_recipient_id = new.user_id and d.day = v_today
        and d.lesson_id = new.lesson_id
    ) then
    raise exception 'This lesson isn''t one of today''s lessons.';
  end if;

  if (
    select count(distinct lc.lesson_id) from public.lesson_completions lc
    where lc.user_id = new.user_id
      and public.user_day(new.user_id, lc.completed_at) = v_today
      and lc.lesson_id <> new.lesson_id
  ) >= 5 then
    raise exception 'You''ve finished today''s lessons. New lessons open tomorrow.';
  end if;
  return new;
end;
$$;

create or replace function public.my_learning_access()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'unlimited', public.learner_has_family(auth.uid()),
    'managed', public.learner_is_managed(auth.uid()),
    'today', public.user_today(auth.uid()),
    'time_zone', (select p.time_zone from public.profiles p where p.id = auth.uid())
  );
$$;
