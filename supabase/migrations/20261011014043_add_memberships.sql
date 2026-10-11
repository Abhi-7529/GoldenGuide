-- Memberships for GoldenGuide: Free ($0) and GoldenGuide Family ($7.99/month).
--
-- Only caregivers subscribe. Membership rows are written by the server (with
-- the service role key) after verifying the subscription with Stripe, so no
-- user can grant themselves a plan: the table has no insert/update/delete
-- policies, and set_active_learner() is the only user-callable writer.
--
-- Rules enforced here, not just in the UI:
-- * Free caregivers connect with 1 learner; Family caregivers with up to 3.
-- * Learners whose caregivers are all on Free finish at most 5 different
--   lessons per calendar day. If a caregiver picked today's lessons, only
--   those can be finished.
-- * If a Family plan ends, connections and progress stay, but a Free
--   caregiver only manages one active learner (picks, suggestions). The rest
--   are paused until the caregiver upgrades or switches who is active.
--
-- "Calendar day" uses America/New_York, matching APP_TIME_ZONE in
-- src/lib/membership.ts. Change both together.

-- ---------------------------------------------------------------------------
-- day helpers
-- ---------------------------------------------------------------------------
create or replace function public.app_day(p_ts timestamptz)
returns date
language sql
immutable
set search_path = public
as $$
  select (p_ts at time zone 'America/New_York')::date;
$$;

create or replace function public.app_today()
returns date
language sql
stable
set search_path = public
as $$
  select public.app_day(now());
$$;

-- ---------------------------------------------------------------------------
-- memberships (one row per caregiver who has subscribed or picked a learner)
-- ---------------------------------------------------------------------------
create table if not exists public.memberships (
  caregiver_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  -- Stripe's subscription status, or 'none' before the first checkout.
  status text not null default 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- On the Free plan with more than one connection, the learner the
  -- caregiver chose to keep active.
  active_learner_id uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.memberships enable row level security;

drop trigger if exists memberships_set_updated_at on public.memberships;
create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- caregiver_id is the primary key, so this policy is already indexed.
create policy "memberships_select_own" on public.memberships
  for select to authenticated
  using (caregiver_id = auth.uid());

-- ---------------------------------------------------------------------------
-- plan helpers (internal; used by triggers and the RPCs below)
-- ---------------------------------------------------------------------------
create or replace function public.caregiver_has_family(p_caregiver uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.caregiver_id = p_caregiver
      and m.status in ('active', 'trialing', 'past_due')
      and m.current_period_end > now()
  );
$$;

create or replace function public.caregiver_learner_limit(p_caregiver uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when public.caregiver_has_family(p_caregiver) then 3 else 1 end;
$$;

-- Whether the caregiver can use dashboard tools (picks, suggestions) for this
-- learner: always on Family; on Free only for their single or chosen learner.
create or replace function public.caregiver_manages(p_caregiver uuid, p_recipient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
      select 1 from public.connections c
      where c.caregiver_id = p_caregiver and c.care_recipient_id = p_recipient
    )
    and (
      public.caregiver_has_family(p_caregiver)
      or (select count(*) from public.connections c where c.caregiver_id = p_caregiver) = 1
      or exists (
        select 1 from public.memberships m
        where m.caregiver_id = p_caregiver and m.active_learner_id = p_recipient
      )
    );
$$;

create or replace function public.learner_has_family(p_learner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.connections c
    where c.care_recipient_id = p_learner
      and public.caregiver_has_family(c.caregiver_id)
  );
$$;

revoke all on function public.caregiver_has_family(uuid) from public, anon, authenticated;
revoke all on function public.caregiver_learner_limit(uuid) from public, anon, authenticated;
revoke all on function public.caregiver_manages(uuid, uuid) from public, anon, authenticated;
revoke all on function public.learner_has_family(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- connection limits
-- ---------------------------------------------------------------------------
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

  if (select count(*) from public.connections c where c.caregiver_id = new.caregiver_id)
     >= public.caregiver_learner_limit(new.caregiver_id) then
    raise exception 'This caregiver can''t connect with anyone else right now. Please let them know.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_connection_limit() from public, anon, authenticated;

drop trigger if exists connections_enforce_limit on public.connections;
create trigger connections_enforce_limit
  before insert on public.connections
  for each row execute function public.enforce_connection_limit();

-- ---------------------------------------------------------------------------
-- today's lessons, picked by a Free caregiver (up to 5 per learner per day)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_lessons (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  care_recipient_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  day date not null default public.app_today(),
  created_at timestamptz not null default now(),
  unique (care_recipient_id, day, lesson_id)
);

alter table public.daily_lessons enable row level security;

-- The unique constraint's index covers care_recipient_id lookups.
create index if not exists daily_lessons_caregiver_idx
  on public.daily_lessons (caregiver_id, day);
create index if not exists daily_lessons_lesson_idx
  on public.daily_lessons (lesson_id);

create policy "daily_lessons_select_caregiver" on public.daily_lessons
  for select to authenticated
  using (caregiver_id = auth.uid());

create policy "daily_lessons_select_recipient" on public.daily_lessons
  for select to authenticated
  using (care_recipient_id = auth.uid());

create policy "daily_lessons_insert_caregiver" on public.daily_lessons
  for insert to authenticated
  with check (caregiver_id = auth.uid());

create policy "daily_lessons_delete_caregiver" on public.daily_lessons
  for delete to authenticated
  using (caregiver_id = auth.uid());

create or replace function public.enforce_daily_lesson_pick()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.day := public.app_today();

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

revoke all on function public.enforce_daily_lesson_pick() from public, anon, authenticated;

drop trigger if exists daily_lessons_enforce_pick on public.daily_lessons;
create trigger daily_lessons_enforce_pick
  before insert on public.daily_lessons
  for each row execute function public.enforce_daily_lesson_pick();

-- ---------------------------------------------------------------------------
-- paused learners can't receive suggestions
-- ---------------------------------------------------------------------------
create or replace function public.require_managed_learner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.caregiver_manages(new.caregiver_id, new.care_recipient_id) then
    raise exception 'This person is paused on your Free plan. Make them your active learner first.';
  end if;
  return new;
end;
$$;

revoke all on function public.require_managed_learner() from public, anon, authenticated;

drop trigger if exists lesson_suggestions_require_managed on public.lesson_suggestions;
create trigger lesson_suggestions_require_managed
  before insert on public.lesson_suggestions
  for each row execute function public.require_managed_learner();

drop trigger if exists topic_suggestions_require_managed on public.topic_suggestions;
create trigger topic_suggestions_require_managed
  before insert on public.topic_suggestions
  for each row execute function public.require_managed_learner();

-- ---------------------------------------------------------------------------
-- daily lesson limit on the Free plan
-- ---------------------------------------------------------------------------
create or replace function public.enforce_daily_lesson_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := public.app_today();
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
      and public.app_day(lc.completed_at) = v_today
      and lc.lesson_id <> new.lesson_id
  ) >= 5 then
    raise exception 'You''ve finished today''s lessons. New lessons open tomorrow.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_daily_lesson_limit() from public, anon, authenticated;

drop trigger if exists lesson_completions_enforce_daily_limit on public.lesson_completions;
create trigger lesson_completions_enforce_daily_limit
  before insert on public.lesson_completions
  for each row execute function public.enforce_daily_lesson_limit();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- The calling caregiver's plan and which connected learners they manage.
create or replace function public.my_membership()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'plan', case when public.caregiver_has_family(auth.uid()) then 'family' else 'free' end,
    'learner_limit', public.caregiver_learner_limit(auth.uid()),
    'status', coalesce(m.status, 'none'),
    'current_period_end', m.current_period_end,
    'cancel_at_period_end', coalesce(m.cancel_at_period_end, false),
    'active_learner_id', m.active_learner_id,
    'managed_ids', coalesce((
      select jsonb_agg(c.care_recipient_id)
      from public.connections c
      where c.caregiver_id = auth.uid()
        and public.caregiver_manages(auth.uid(), c.care_recipient_id)
    ), '[]'::jsonb)
  )
  from (select 1) as one
  left join public.memberships m on m.caregiver_id = auth.uid();
$$;

-- The calling learner's lesson allowance for today.
create or replace function public.my_learning_access()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'unlimited', public.learner_has_family(auth.uid()),
    'today', public.app_today()
  );
$$;

-- On the Free plan, choose which connected learner stays active.
create or replace function public.set_active_learner(p_recipient uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.connections c
    where c.caregiver_id = auth.uid() and c.care_recipient_id = p_recipient
  ) then
    raise exception 'You are not connected to this person.';
  end if;

  insert into public.memberships (caregiver_id, active_learner_id)
  values (auth.uid(), p_recipient)
  on conflict (caregiver_id) do update
    set active_learner_id = excluded.active_learner_id;
end;
$$;

revoke all on function public.my_membership() from public, anon;
revoke all on function public.my_learning_access() from public, anon;
revoke all on function public.set_active_learner(uuid) from public, anon;
revoke all on function public.app_day(timestamptz) from public, anon;
revoke all on function public.app_today() from public, anon;

grant execute on function public.my_membership() to authenticated;
grant execute on function public.my_learning_access() to authenticated;
grant execute on function public.set_active_learner(uuid) to authenticated;
-- app_today() is the default for daily_lessons.day, evaluated as the caller.
grant execute on function public.app_day(timestamptz) to authenticated;
grant execute on function public.app_today() to authenticated;
