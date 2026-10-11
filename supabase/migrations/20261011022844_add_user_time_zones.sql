-- Per-person time zones, so "today" (the Free plan's daily lesson limit and a
-- caregiver's picks for today) follows each learner's own calendar day.
--
-- The time zone comes from the person's device (the browser's Intl settings),
-- so there's no location prompt. It's saved at signup and kept up to date on
-- later visits through set_my_time_zone(). Unknown names fall back to the
-- previous fixed zone, America/New_York.

alter table public.profiles
  add column if not exists time_zone text not null default 'America/New_York';

-- Only accept real IANA zone names.
create or replace function public.valid_time_zone(p_zone text)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when exists (select 1 from pg_timezone_names where name = p_zone) then p_zone
    else 'America/New_York'
  end;
$$;

create or replace function public.clean_profile_time_zone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.time_zone := public.valid_time_zone(new.time_zone);
  return new;
end;
$$;

drop trigger if exists profiles_clean_time_zone on public.profiles;
create trigger profiles_clean_time_zone
  before insert on public.profiles
  for each row execute function public.clean_profile_time_zone();

-- A person's calendar day for a moment, and their "today".
create or replace function public.user_day(p_user uuid, p_ts timestamptz)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (p_ts at time zone coalesce(
    (select p.time_zone from public.profiles p where p.id = p_user),
    'America/New_York'
  ))::date;
$$;

create or replace function public.user_today(p_user uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select public.user_day(p_user, now());
$$;

revoke all on function public.user_day(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.user_today(uuid) from public, anon, authenticated;
revoke all on function public.clean_profile_time_zone() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- "today" now means the learner's today
-- ---------------------------------------------------------------------------
create or replace function public.enforce_daily_lesson_pick()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.day := public.user_today(new.care_recipient_id);

  if not public.caregiver_manages(new.caregiver_id, new.care_recipient_id) then
    raise exception 'This person is paused on your Free plan. Make them your active learner first.';
  end if;

  if not exists (
    select 1 from public.lessons l where l.id = new.lesson_id and l.status = 'published'
  ) then
    raise exception 'That lesson isn''t available.';
  end if;

  if (
    select count(*) from public.daily_lessons d
    where d.care_recipient_id = new.care_recipient_id and d.day = new.day
  ) >= 5 then
    raise exception 'You can pick up to 5 lessons a day.';
  end if;
  return new;
end;
$$;

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

  if exists (
      select 1 from public.daily_lessons d
      where d.care_recipient_id = new.user_id and d.day = v_today
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
    'today', public.user_today(auth.uid()),
    'time_zone', (select p.time_zone from public.profiles p where p.id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Saves the caller's device time zone (only the time_zone column).
create or replace function public.set_my_time_zone(p_zone text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set time_zone = public.valid_time_zone(p_zone)
  where id = auth.uid();
$$;

-- Each connected learner's time zone and today, for the caregiver's picks.
create or replace function public.my_learners_today()
returns table (learner_id uuid, time_zone text, today date)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.time_zone, public.user_today(p.id)
  from public.connections c
  join public.profiles p on p.id = c.care_recipient_id
  where c.caregiver_id = auth.uid();
$$;

revoke all on function public.set_my_time_zone(text) from public, anon;
revoke all on function public.my_learners_today() from public, anon;
grant execute on function public.set_my_time_zone(text) to authenticated;
grant execute on function public.my_learners_today() to authenticated;
