-- Learners with a caregiver only do the lessons their caregiver chooses:
-- * caregiver on Family: lessons the caregiver assigned (lesson_suggestions),
--   with no daily limit. Assigned lessons stay available after they're done.
-- * caregiver on Free: the caregiver's picks for today (daily_lessons), up
--   to 5.
-- Learners without a managing caregiver (learning alone, or paused on their
-- caregiver's Free plan) keep up to 5 lessons a day of their own choosing.

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
    if not exists (
      select 1 from public.lesson_suggestions s
      where s.care_recipient_id = new.user_id and s.lesson_id = new.lesson_id
    ) then
      raise exception 'This lesson hasn''t been assigned to you yet.';
    end if;
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
