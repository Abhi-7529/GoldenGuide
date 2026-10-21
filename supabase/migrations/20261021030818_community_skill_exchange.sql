-- Community Skill Exchange, phase 1.
--
-- Trusted student volunteers teach a caregiver's learners practical skills,
-- and the caregiver confirms the time they gave. It is private: a caregiver
-- invites students they know with a single-use code, and decides which of
-- their learners each student may work with.
--
-- 1. A third role, 'student'. A student profile can only be created by
--    redeem_student_invitation(), which checks and uses up a caregiver's
--    code in the same transaction. The direct profile insert policy now
--    refuses the student role, so there's no way around the code.
-- 2. student_profiles / student_skills: what caregivers see about a student.
-- 3. community_invitations: codes are stored only as a SHA-256 hash, expire
--    after 7 days, are single use and can be revoked. invitation_attempts
--    rate-limits redemption.
-- 4. community_members / community_learner_access: who belongs to which
--    caregiver's community, and which learners each student may work with.
--    Removing a student keeps their past records.
-- 5. community_sessions / session_events: one caregiver, one student, one
--    learner. Every change goes through the RPCs below, which check the
--    caller's part in the session and the allowed status changes, and log
--    an audit event. Tables only have SELECT policies for signed-in users,
--    apart from students managing their own skills.
--
-- Session statuses:
--   pending_approval      a student asked; waiting for the caregiver
--   invited               the caregiver asked (or changed the time); waiting for the student
--   scheduled             both agreed
--   pending_verification  the student logged their time; waiting for the caregiver
--   correction_requested  the caregiver asked the student to fix the record
--   verified              the caregiver confirmed the time (counts toward hours)
--   disputed              the caregiver doesn't agree the session happened as logged
--   rejected              the other side said no to the request
--   canceled              called off (by either side, the learner, or a removal)

-- ---------------------------------------------------------------------------
-- 1. student role
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('caregiver', 'care_recipient', 'student'));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role in ('caregiver', 'care_recipient'));

-- The part of a name a learner or student sees about the other.
create or replace function public.first_name(p_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(nullif(split_part(trim(coalesce(p_name, '')), ' ', 1), ''), 'Someone');
$$;

-- ---------------------------------------------------------------------------
-- 2. student profiles and skills
-- ---------------------------------------------------------------------------
create table if not exists public.student_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 60),
  intro text not null default '' check (length(intro) <= 600),
  availability text not null default '' check (length(availability) <= 300),
  interests text not null default '' check (length(interests) <= 300),
  -- When the student confirmed they are 13 or older, and that a parent or
  -- guardian knows and agrees if they are under 18. Self-reported.
  age_confirmed_at timestamptz not null,
  guardian_ack_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;

drop trigger if exists student_profiles_set_updated_at on public.student_profiles;
create trigger student_profiles_set_updated_at
  before update on public.student_profiles
  for each row execute function public.set_updated_at();

create table if not exists public.student_skills (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles (id) on delete cascade,
  category text not null check (
    category in ('technology', 'money', 'scams', 'cooking', 'art', 'other')
  ),
  title text not null check (length(trim(title)) between 1 and 80),
  description text not null default '' check (length(description) <= 300),
  created_at timestamptz not null default now()
);

alter table public.student_skills enable row level security;

create index if not exists student_skills_student_id_idx
  on public.student_skills (student_id);

-- ---------------------------------------------------------------------------
-- 3. invitations and redemption attempts
-- ---------------------------------------------------------------------------
create table if not exists public.community_invitations (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  code_hash bytea not null unique,
  label text not null default '' check (length(label) <= 60),
  expires_at timestamptz not null,
  consumed_by uuid references public.profiles (id) on delete set null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.community_invitations enable row level security;

create index if not exists community_invitations_caregiver_id_idx
  on public.community_invitations (caregiver_id);

create table if not exists public.invitation_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  succeeded boolean not null,
  created_at timestamptz not null default now()
);

-- Nobody reads or writes this directly; only redeem_student_invitation().
alter table public.invitation_attempts enable row level security;

create index if not exists invitation_attempts_user_created_idx
  on public.invitation_attempts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. community membership and learner access
-- ---------------------------------------------------------------------------
create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.student_profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'removed')),
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (caregiver_id, student_id)
);

alter table public.community_members enable row level security;

-- (caregiver_id, student_id) is covered by the unique constraint.
create index if not exists community_members_student_id_idx
  on public.community_members (student_id);

create table if not exists public.community_learner_access (
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.student_profiles (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (caregiver_id, student_id, learner_id)
);

alter table public.community_learner_access enable row level security;

create index if not exists community_learner_access_student_id_idx
  on public.community_learner_access (student_id);

-- ---------------------------------------------------------------------------
-- 5. sessions and their audit history
-- ---------------------------------------------------------------------------
create table if not exists public.community_sessions (
  id uuid primary key default gen_random_uuid(),
  -- Kept (as null) if the caregiver's or learner's account is deleted, so
  -- the student's service record survives. Names are saved for the record.
  caregiver_id uuid references public.profiles (id) on delete set null,
  student_id uuid not null references public.student_profiles (id) on delete cascade,
  learner_id uuid references public.profiles (id) on delete set null,
  caregiver_name text not null,
  student_name text not null,
  learner_name text not null,
  topic text not null check (length(trim(topic)) between 1 and 100),
  description text not null default '' check (length(description) <= 1000),
  format text not null check (format in ('remote', 'supervised_in_person')),
  -- How to join (a video call link, "on Mom's iPad", ...). Caregiver only.
  join_details text not null default '' check (length(join_details) <= 500),
  scheduled_at timestamptz not null,
  planned_minutes integer not null check (planned_minutes between 15 and 120),
  -- Real time given; not limited by the caregiver's plan.
  actual_minutes integer check (actual_minutes between 1 and 600),
  activity_notes text not null default '' check (length(activity_notes) <= 2000),
  status text not null check (
    status in (
      'pending_approval', 'invited', 'scheduled', 'pending_verification',
      'correction_requested', 'verified', 'disputed', 'rejected', 'canceled'
    )
  ),
  requested_by text not null check (requested_by in ('caregiver', 'student')),
  learner_response text not null default 'pending'
    check (learner_response in ('pending', 'yes', 'no')),
  -- The caregiver's reason when rejecting, canceling, asking for a
  -- correction or disputing.
  caregiver_note text not null default '' check (length(caregiver_note) <= 1000),
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_sessions enable row level security;

create index if not exists community_sessions_caregiver_id_idx
  on public.community_sessions (caregiver_id);
create index if not exists community_sessions_student_id_idx
  on public.community_sessions (student_id);
create index if not exists community_sessions_learner_id_idx
  on public.community_sessions (learner_id);

drop trigger if exists community_sessions_set_updated_at on public.community_sessions;
create trigger community_sessions_set_updated_at
  before update on public.community_sessions
  for each row execute function public.set_updated_at();

create table if not exists public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.community_sessions (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text not null check (actor_role in ('caregiver', 'student', 'learner')),
  event text not null,
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  -- clock_timestamp keeps several events from one transaction in order.
  created_at timestamptz not null default clock_timestamp()
);

alter table public.session_events enable row level security;

create index if not exists session_events_session_id_idx
  on public.session_events (session_id, created_at desc);

-- ---------------------------------------------------------------------------
-- internal helpers (not callable by users)
-- ---------------------------------------------------------------------------
create or replace function public.community_member_active(p_caregiver uuid, p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_members m
    where m.caregiver_id = p_caregiver and m.student_id = p_student and m.status = 'active'
  );
$$;

create or replace function public.caregiver_has_learner(p_caregiver uuid, p_learner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.connections c
    where c.caregiver_id = p_caregiver and c.care_recipient_id = p_learner
  );
$$;

-- The caregiver whose community lets this student work with this learner:
-- an active member, approved for the learner, who is still connected.
create or replace function public.student_learner_caregiver(p_student uuid, p_learner uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.caregiver_id
  from public.community_learner_access a
  where a.student_id = p_student
    and a.learner_id = p_learner
    and public.community_member_active(a.caregiver_id, p_student)
    and public.caregiver_has_learner(a.caregiver_id, p_learner)
  limit 1;
$$;

-- Longest session a caregiver can plan. Everyone gets 30 minutes in phase 1;
-- a premium plan can raise this to 120 later without changing the RPCs.
create or replace function public.max_planned_minutes(p_caregiver uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select 30;
$$;

create or replace function public.log_session_event(
  p_session uuid,
  p_actor_role text,
  p_event text,
  p_from text,
  p_to text,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.session_events (session_id, actor_id, actor_role, event, from_status, to_status, details)
  values (p_session, auth.uid(), p_actor_role, p_event, p_from, p_to, coalesce(p_details, '{}'::jsonb));
$$;

-- Cancels a student's upcoming sessions with a caregiver (optionally only
-- with one learner), for removals and withdrawn access. Sessions that have
-- already started stay, so the student can still log time they gave.
create or replace function public.cancel_upcoming_sessions(
  p_caregiver uuid,
  p_student uuid,
  p_learner uuid,
  p_reason text,
  p_actor_role text default 'caregiver'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.community_sessions;
begin
  for v_session in
    select * from public.community_sessions s
    where s.caregiver_id = p_caregiver
      and s.student_id = p_student
      and (p_learner is null or s.learner_id = p_learner)
      and (
        s.status in ('pending_approval', 'invited')
        or (s.status = 'scheduled' and s.scheduled_at > now())
      )
    for update
  loop
    update public.community_sessions set status = 'canceled' where id = v_session.id;
    perform public.log_session_event(
      v_session.id, p_actor_role, 'canceled', v_session.status, 'canceled',
      jsonb_build_object('reason', p_reason)
    );
  end loop;
end;
$$;

-- Readable invitation codes: 10 characters from 32 that don't look alike
-- (no I, O, 0 or 1), shown as XXXXX-XXXXX. People may type them with
-- spaces, dashes or lower case.
create or replace function public.normalize_invitation_code(p_code text)
returns text
language sql
immutable
set search_path = public
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function public.invitation_code_hash(p_code text)
returns bytea
language sql
immutable
set search_path = public
as $$
  select sha256(convert_to(public.normalize_invitation_code(p_code), 'UTF8'));
$$;

revoke all on function public.community_member_active(uuid, uuid) from public, anon, authenticated;
revoke all on function public.caregiver_has_learner(uuid, uuid) from public, anon, authenticated;
revoke all on function public.student_learner_caregiver(uuid, uuid) from public, anon, authenticated;
revoke all on function public.max_planned_minutes(uuid) from public, anon, authenticated;
revoke all on function public.log_session_event(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.cancel_upcoming_sessions(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.normalize_invitation_code(text) from public, anon, authenticated;
revoke all on function public.invitation_code_hash(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: reading
-- ---------------------------------------------------------------------------
drop policy if exists "student_profiles_select" on public.student_profiles;
create policy "student_profiles_select" on public.student_profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.community_members m
      where m.student_id = student_profiles.id and m.caregiver_id = auth.uid()
    )
  );

drop policy if exists "student_skills_select" on public.student_skills;
create policy "student_skills_select" on public.student_skills
  for select to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.community_members m
      where m.student_id = student_skills.student_id and m.caregiver_id = auth.uid()
    )
  );

drop policy if exists "community_invitations_select_caregiver" on public.community_invitations;
create policy "community_invitations_select_caregiver" on public.community_invitations
  for select to authenticated
  using (caregiver_id = auth.uid());

drop policy if exists "community_members_select" on public.community_members;
create policy "community_members_select" on public.community_members
  for select to authenticated
  using (caregiver_id = auth.uid() or student_id = auth.uid());

drop policy if exists "community_learner_access_select" on public.community_learner_access;
create policy "community_learner_access_select" on public.community_learner_access
  for select to authenticated
  using (caregiver_id = auth.uid() or student_id = auth.uid());

-- Students keep seeing their own sessions after a removal: it's their record.
drop policy if exists "community_sessions_select" on public.community_sessions;
create policy "community_sessions_select" on public.community_sessions
  for select to authenticated
  using (
    caregiver_id = auth.uid() or student_id = auth.uid() or learner_id = auth.uid()
  );

drop policy if exists "session_events_select" on public.session_events;
create policy "session_events_select" on public.session_events
  for select to authenticated
  using (
    exists (
      select 1 from public.community_sessions s
      where s.id = session_events.session_id
        and (s.caregiver_id = auth.uid() or s.student_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: students manage their own skills (up to 20)
-- ---------------------------------------------------------------------------
drop policy if exists "student_skills_insert_own" on public.student_skills;
create policy "student_skills_insert_own" on public.student_skills
  for insert to authenticated
  with check (student_id = auth.uid());

drop policy if exists "student_skills_update_own" on public.student_skills;
create policy "student_skills_update_own" on public.student_skills
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "student_skills_delete_own" on public.student_skills;
create policy "student_skills_delete_own" on public.student_skills
  for delete to authenticated
  using (student_id = auth.uid());

create or replace function public.enforce_student_skill_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.student_skills s where s.student_id = new.student_id) >= 20 then
    raise exception 'You can list up to 20 skills.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_student_skill_limit() from public, anon, authenticated;

drop trigger if exists student_skills_limit on public.student_skills;
create trigger student_skills_limit
  before insert on public.student_skills
  for each row execute function public.enforce_student_skill_limit();

-- ---------------------------------------------------------------------------
-- RPCs: invitations
-- ---------------------------------------------------------------------------

-- Makes a new code. The plain code is returned only here; the database keeps
-- just its hash, so the caregiver copies it now or makes a new one later.
create or replace function public.create_student_invitation(p_label text default '')
returns table (id uuid, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
  v_row public.community_invitations;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'caregiver') then
    raise exception 'Only caregivers can invite students.';
  end if;

  if (
    select count(*) from public.community_invitations i
    where i.caregiver_id = auth.uid()
      and i.consumed_at is null and i.revoked_at is null and i.expires_at > now()
  ) >= 10 then
    raise exception 'You have 10 unused invitations. Cancel one before making another.';
  end if;

  loop
    v_bytes := extensions.gen_random_bytes(10);
    v_code := '';
    for i in 0..9 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) & 31) + 1, 1);
    end loop;
    exit when not exists (
      select 1 from public.community_invitations i
      where i.code_hash = public.invitation_code_hash(v_code)
    );
  end loop;

  insert into public.community_invitations (caregiver_id, code_hash, label, expires_at)
  values (
    auth.uid(),
    public.invitation_code_hash(v_code),
    left(trim(coalesce(p_label, '')), 60),
    now() + interval '7 days'
  )
  returning * into v_row;

  return query select v_row.id, substr(v_code, 1, 5) || '-' || substr(v_code, 6, 5), v_row.expires_at;
end;
$$;

create or replace function public.revoke_student_invitation(p_invitation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_invitations
  set revoked_at = now()
  where id = p_invitation
    and caregiver_id = auth.uid()
    and consumed_at is null
    and revoked_at is null;
  if not found then
    raise exception 'That invitation can''t be canceled. It may already be used or canceled.';
  end if;
end;
$$;

-- Turns a code into a student account (for someone who has signed in but
-- not set up a profile yet), or into another community for an existing
-- student. Everything happens in one transaction: if any step fails, the
-- code stays unused.
--
-- Returns {ok: true, caregiver_name} or {ok: false, error}. Failures are
-- returned rather than raised so the attempt is still recorded for rate
-- limiting. Unknown, expired, used and canceled codes all get the same
-- message, so it gives nothing away.
create or replace function public.redeem_student_invitation(
  p_code text,
  p_display_name text default null,
  p_age_confirmed boolean default false,
  p_guardian_ack boolean default false,
  p_time_zone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_name text := trim(coalesce(p_display_name, ''));
  v_invite public.community_invitations;
  v_member public.community_members;
  v_caregiver_name text;
begin
  if v_uid is null then
    raise exception 'Please sign in first.';
  end if;

  select p.role into v_role from public.profiles p where p.id = v_uid;

  if v_role is not null and v_role <> 'student' then
    return jsonb_build_object(
      'ok', false,
      'error', 'This account is already set up as a caregiver or learner. To volunteer, please sign up for a separate student account with a different email.'
    );
  end if;

  if (
      select count(*) from public.invitation_attempts a
      where a.user_id = v_uid and not a.succeeded and a.created_at > now() - interval '1 hour'
    ) >= 5
    or (
      select count(*) from public.invitation_attempts a
      where a.user_id = v_uid and not a.succeeded and a.created_at > now() - interval '1 day'
    ) >= 20 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Too many tries. Please wait an hour and try again, or ask the person who invited you for a new code.'
    );
  end if;

  if v_role is null then
    if length(v_name) < 1 or length(v_name) > 60 then
      return jsonb_build_object('ok', false, 'error', 'Please enter a name between 1 and 60 characters.');
    end if;
    if not coalesce(p_age_confirmed, false) or not coalesce(p_guardian_ack, false) then
      return jsonb_build_object('ok', false, 'error', 'Please confirm both boxes to continue.');
    end if;
  end if;

  -- Lock the code so two requests can't both use it.
  select * into v_invite
  from public.community_invitations i
  where i.code_hash = public.invitation_code_hash(p_code)
    and i.consumed_at is null
    and i.revoked_at is null
    and i.expires_at > now()
  for update;

  if v_invite.id is null then
    insert into public.invitation_attempts (user_id, succeeded) values (v_uid, false);
    return jsonb_build_object(
      'ok', false,
      'error', 'That code didn''t work. It may be mistyped, used already, canceled or expired. Please check it or ask for a new one.'
    );
  end if;

  select * into v_member from public.community_members m
  where m.caregiver_id = v_invite.caregiver_id and m.student_id = v_uid;

  if v_member.status = 'active' then
    -- Leave the code unused so the caregiver can give it to someone else.
    return jsonb_build_object('ok', false, 'error', 'You''re already part of this family''s community.');
  end if;

  if v_role is null then
    insert into public.profiles (id, role, full_name, time_zone)
    values (v_uid, 'student', v_name, p_time_zone);
    insert into public.student_profiles (id, display_name, age_confirmed_at, guardian_ack_at)
    values (v_uid, v_name, now(), now());
  end if;

  if v_member.id is null then
    insert into public.community_members (caregiver_id, student_id)
    values (v_invite.caregiver_id, v_uid);
  else
    -- Invited back after being removed.
    update public.community_members
    set status = 'active', joined_at = now(), removed_at = null
    where id = v_member.id;
  end if;

  update public.community_invitations
  set consumed_by = v_uid, consumed_at = now()
  where id = v_invite.id;

  insert into public.invitation_attempts (user_id, succeeded) values (v_uid, true);

  select public.first_name(p.full_name) into v_caregiver_name
  from public.profiles p where p.id = v_invite.caregiver_id;

  return jsonb_build_object('ok', true, 'caregiver_name', v_caregiver_name);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs: community membership
-- ---------------------------------------------------------------------------

-- Ends a student's place in the caregiver's community. Their upcoming
-- sessions are canceled; past sessions and service records stay.
create or replace function public.remove_community_student(p_student uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_members
  set status = 'removed', removed_at = now()
  where caregiver_id = auth.uid() and student_id = p_student and status = 'active';
  if not found then
    raise exception 'That student isn''t in your community.';
  end if;

  delete from public.community_learner_access
  where caregiver_id = auth.uid() and student_id = p_student;

  perform public.cancel_upcoming_sessions(auth.uid(), p_student, null, 'student_removed');
end;
$$;

-- Lets (or stops) a student work with one of the caregiver's learners.
create or replace function public.set_student_learner_access(
  p_student uuid,
  p_learner uuid,
  p_allowed boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.community_member_active(auth.uid(), p_student) then
    raise exception 'That student isn''t in your community.';
  end if;
  if not public.caregiver_has_learner(auth.uid(), p_learner) then
    raise exception 'That learner isn''t connected to you.';
  end if;

  if p_allowed then
    insert into public.community_learner_access (caregiver_id, student_id, learner_id)
    values (auth.uid(), p_student, p_learner)
    on conflict do nothing;
  else
    delete from public.community_learner_access
    where caregiver_id = auth.uid() and student_id = p_student and learner_id = p_learner;
    perform public.cancel_upcoming_sessions(auth.uid(), p_student, p_learner, 'access_withdrawn');
  end if;
end;
$$;

-- A student's communities, with the caregiver's first name and the learners
-- (first names only) they may work with. Removed communities are listed
-- without learners so the student understands why they're gone.
create or replace function public.my_student_communities()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'caregiver_id', m.caregiver_id,
      'caregiver_name', public.first_name(cg.full_name),
      'status', m.status,
      'joined_at', m.joined_at,
      'learners', case when m.status = 'active' then coalesce((
        select jsonb_agg(
          jsonb_build_object('id', l.id, 'name', public.first_name(l.full_name))
          order by l.full_name
        )
        from public.community_learner_access a
        join public.profiles l on l.id = a.learner_id
        where a.caregiver_id = m.caregiver_id
          and a.student_id = m.student_id
          and public.caregiver_has_learner(m.caregiver_id, a.learner_id)
      ), '[]'::jsonb) else '[]'::jsonb end
    )
    order by m.status, m.joined_at desc
  ), '[]'::jsonb)
  from public.community_members m
  join public.profiles cg on cg.id = m.caregiver_id
  where m.student_id = auth.uid();
$$;

-- Students can leave a community themselves.
create or replace function public.leave_community(p_caregiver uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_members
  set status = 'removed', removed_at = now()
  where caregiver_id = p_caregiver and student_id = auth.uid() and status = 'active';
  if not found then
    raise exception 'You''re not part of that community.';
  end if;

  delete from public.community_learner_access
  where caregiver_id = p_caregiver and student_id = auth.uid();

  perform public.cancel_upcoming_sessions(p_caregiver, auth.uid(), null, 'student_left', 'student');
end;
$$;

create or replace function public.update_student_profile(
  p_display_name text,
  p_intro text,
  p_availability text,
  p_interests text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_display_name, ''));
begin
  if length(v_name) < 1 or length(v_name) > 60 then
    raise exception 'Please enter a name between 1 and 60 characters.';
  end if;

  update public.student_profiles
  set display_name = v_name,
      intro = trim(coalesce(p_intro, '')),
      availability = trim(coalesce(p_availability, '')),
      interests = trim(coalesce(p_interests, ''))
  where id = auth.uid();
  if not found then
    raise exception 'Only student volunteers have a volunteer profile.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs: sessions
-- ---------------------------------------------------------------------------
create or replace function public.check_session_plan(
  p_caregiver uuid,
  p_topic text,
  p_format text,
  p_scheduled_at timestamptz,
  p_planned_minutes integer
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if length(trim(coalesce(p_topic, ''))) < 1 then
    raise exception 'Please enter a topic.';
  end if;
  if p_format is null or p_format not in ('remote', 'supervised_in_person') then
    raise exception 'Please choose how the session will happen.';
  end if;
  if p_scheduled_at is null or p_scheduled_at <= now() then
    raise exception 'Please choose a time in the future.';
  end if;
  if p_scheduled_at > now() + interval '1 year' then
    raise exception 'Please choose a time within the next year.';
  end if;
  if p_planned_minutes is null or p_planned_minutes < 15
     or p_planned_minutes > public.max_planned_minutes(p_caregiver) then
    raise exception 'Sessions can be planned for up to % minutes.', public.max_planned_minutes(p_caregiver);
  end if;
end;
$$;

revoke all on function public.check_session_plan(uuid, text, text, timestamptz, integer) from public, anon, authenticated;

-- The caregiver plans a session; the student then accepts or declines.
-- In-person sessions need the caregiver to confirm an adult will be there.
create or replace function public.caregiver_create_session(
  p_student uuid,
  p_learner uuid,
  p_topic text,
  p_description text,
  p_format text,
  p_join_details text,
  p_scheduled_at timestamptz,
  p_planned_minutes integer,
  p_supervision_confirmed boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.community_member_active(auth.uid(), p_student) then
    raise exception 'That student isn''t in your community.';
  end if;
  if not public.caregiver_has_learner(auth.uid(), p_learner) then
    raise exception 'That learner isn''t connected to you.';
  end if;
  perform public.check_session_plan(auth.uid(), p_topic, p_format, p_scheduled_at, p_planned_minutes);
  if p_format = 'supervised_in_person' and not coalesce(p_supervision_confirmed, false) then
    raise exception 'For in-person sessions, please confirm a trusted adult will be there.';
  end if;

  insert into public.community_sessions (
    caregiver_id, student_id, learner_id,
    caregiver_name, student_name, learner_name,
    topic, description, format, join_details,
    scheduled_at, planned_minutes, status, requested_by
  )
  select
    auth.uid(), p_student, p_learner,
    cg.full_name, sp.display_name, public.first_name(l.full_name),
    trim(p_topic), trim(coalesce(p_description, '')), p_format, trim(coalesce(p_join_details, '')),
    p_scheduled_at, p_planned_minutes, 'invited', 'caregiver'
  from public.profiles cg, public.student_profiles sp, public.profiles l
  where cg.id = auth.uid() and sp.id = p_student and l.id = p_learner
  returning id into v_id;

  perform public.log_session_event(v_id, 'caregiver', 'created', null, 'invited');
  return v_id;
end;
$$;

-- A student asks for a session with a learner the caregiver approved them for.
create or replace function public.student_request_session(
  p_learner uuid,
  p_topic text,
  p_description text,
  p_format text,
  p_scheduled_at timestamptz,
  p_planned_minutes integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caregiver uuid := public.student_learner_caregiver(auth.uid(), p_learner);
  v_id uuid;
begin
  if v_caregiver is null then
    raise exception 'You can only ask for sessions with learners a caregiver has approved for you.';
  end if;
  perform public.check_session_plan(v_caregiver, p_topic, p_format, p_scheduled_at, p_planned_minutes);

  insert into public.community_sessions (
    caregiver_id, student_id, learner_id,
    caregiver_name, student_name, learner_name,
    topic, description, format,
    scheduled_at, planned_minutes, status, requested_by
  )
  select
    v_caregiver, auth.uid(), p_learner,
    cg.full_name, sp.display_name, public.first_name(l.full_name),
    trim(p_topic), trim(coalesce(p_description, '')), p_format,
    p_scheduled_at, p_planned_minutes, 'pending_approval', 'student'
  from public.profiles cg, public.student_profiles sp, public.profiles l
  where cg.id = v_caregiver and sp.id = auth.uid() and l.id = p_learner
  returning id into v_id;

  perform public.log_session_event(v_id, 'student', 'requested', null, 'pending_approval');
  return v_id;
end;
$$;

-- Caregiver changes the time, length or joining details. A new time goes
-- back to the student to confirm.
create or replace function public.caregiver_update_session(
  p_session uuid,
  p_scheduled_at timestamptz,
  p_planned_minutes integer,
  p_join_details text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.community_sessions;
  v_status text;
begin
  select * into v_session from public.community_sessions
  where id = p_session and caregiver_id = auth.uid()
  for update;
  if v_session.id is null then
    raise exception 'Session not found.';
  end if;
  if v_session.status not in ('pending_approval', 'invited', 'scheduled') then
    raise exception 'This session can''t be changed any more.';
  end if;

  if p_scheduled_at is distinct from v_session.scheduled_at
     or p_planned_minutes is distinct from v_session.planned_minutes then
    perform public.check_session_plan(
      auth.uid(), v_session.topic, v_session.format, p_scheduled_at, p_planned_minutes
    );
    v_status := 'invited';
  else
    v_status := v_session.status;
  end if;

  update public.community_sessions
  set scheduled_at = p_scheduled_at,
      planned_minutes = p_planned_minutes,
      join_details = left(trim(coalesce(p_join_details, '')), 500),
      status = v_status
  where id = p_session;

  perform public.log_session_event(
    p_session, 'caregiver',
    case when v_status = 'invited' and v_session.status <> 'invited' then 'rescheduled' else 'updated' end,
    v_session.status, v_status,
    jsonb_build_object(
      'scheduled_at', p_scheduled_at,
      'previous_scheduled_at', v_session.scheduled_at,
      'planned_minutes', p_planned_minutes
    )
  );
end;
$$;

-- Caregiver decisions: approve, reject, cancel, verify, request_correction,
-- dispute. p_note is the reason shown to the student.
create or replace function public.caregiver_session_action(
  p_session uuid,
  p_action text,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.community_sessions;
  v_to text;
  v_note text := left(trim(coalesce(p_note, '')), 1000);
begin
  select * into v_session from public.community_sessions
  where id = p_session and caregiver_id = auth.uid()
  for update;
  if v_session.id is null then
    raise exception 'Session not found.';
  end if;

  if p_action = 'approve' and v_session.status = 'pending_approval' then
    if not public.community_member_active(auth.uid(), v_session.student_id)
       or not public.caregiver_has_learner(auth.uid(), v_session.learner_id) then
      raise exception 'This student or learner is no longer in your community.';
    end if;
    if v_session.scheduled_at <= now() then
      raise exception 'This time has passed. Please change the time first.';
    end if;
    v_to := 'scheduled';
  elsif p_action = 'reject' and v_session.status = 'pending_approval' then
    v_to := 'rejected';
  elsif p_action = 'cancel' and v_session.status in ('pending_approval', 'invited', 'scheduled') then
    v_to := 'canceled';
  elsif p_action = 'verify' and v_session.status in ('pending_verification', 'disputed') then
    v_to := 'verified';
  elsif p_action = 'request_correction' and v_session.status = 'pending_verification' then
    if v_note = '' then
      raise exception 'Please say what needs fixing.';
    end if;
    v_to := 'correction_requested';
  elsif p_action = 'dispute' and v_session.status = 'pending_verification' then
    if v_note = '' then
      raise exception 'Please say why you don''t agree with this record.';
    end if;
    v_to := 'disputed';
  else
    raise exception 'That can''t be done to this session right now.';
  end if;

  update public.community_sessions
  set status = v_to,
      caregiver_note = case when p_action in ('approve', 'verify') then caregiver_note else v_note end,
      verified_at = case when v_to = 'verified' then now() else null end,
      verified_by_name = case
        when v_to = 'verified' then (select p.full_name from public.profiles p where p.id = auth.uid())
        else null
      end
  where id = p_session;

  perform public.log_session_event(
    p_session, 'caregiver', p_action, v_session.status, v_to,
    case
      when v_to = 'verified' then jsonb_build_object('actual_minutes', v_session.actual_minutes)
      when v_note <> '' then jsonb_build_object('note', v_note)
      else '{}'::jsonb
    end
  );
end;
$$;

-- Student decisions on a caregiver's invitation: accept, decline, cancel.
create or replace function public.student_session_action(
  p_session uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.community_sessions;
  v_to text;
begin
  select * into v_session from public.community_sessions
  where id = p_session and student_id = auth.uid()
  for update;
  if v_session.id is null then
    raise exception 'Session not found.';
  end if;

  if p_action = 'accept' and v_session.status = 'invited' then
    if not public.community_member_active(v_session.caregiver_id, auth.uid()) then
      raise exception 'You''re no longer part of this family''s community.';
    end if;
    if v_session.scheduled_at <= now() then
      raise exception 'This time has passed. Please ask the caregiver for a new time.';
    end if;
    v_to := 'scheduled';
  elsif p_action = 'decline' and v_session.status = 'invited' then
    v_to := 'rejected';
  elsif p_action = 'cancel' and v_session.status in ('pending_approval', 'invited', 'scheduled') then
    v_to := 'canceled';
  else
    raise exception 'That can''t be done to this session right now.';
  end if;

  update public.community_sessions set status = v_to where id = p_session;
  perform public.log_session_event(p_session, 'student', p_action, v_session.status, v_to);
end;
$$;

-- The student logs the real time they gave and what they taught, once the
-- session has started. Also used to fix a record the caregiver sent back,
-- or to change a verified one, which then needs verifying again.
create or replace function public.student_submit_hours(
  p_session uuid,
  p_actual_minutes integer,
  p_activity_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.community_sessions;
  v_notes text := trim(coalesce(p_activity_notes, ''));
begin
  select * into v_session from public.community_sessions
  where id = p_session and student_id = auth.uid()
  for update;
  if v_session.id is null then
    raise exception 'Session not found.';
  end if;
  if v_session.status not in ('scheduled', 'correction_requested', 'verified', 'pending_verification') then
    raise exception 'You can only log time for a session that was scheduled.';
  end if;
  if v_session.scheduled_at > now() then
    raise exception 'You can log your time once the session has started.';
  end if;
  if v_session.caregiver_id is null then
    raise exception 'This family''s account was closed, so the record can''t be changed.';
  end if;
  if p_actual_minutes is null or p_actual_minutes < 1 or p_actual_minutes > 600 then
    raise exception 'Please enter between 1 and 600 minutes.';
  end if;
  if length(v_notes) < 1 or length(v_notes) > 2000 then
    raise exception 'Please describe what you did (up to 2000 characters).';
  end if;

  update public.community_sessions
  set status = 'pending_verification',
      actual_minutes = p_actual_minutes,
      activity_notes = v_notes,
      submitted_at = now(),
      verified_at = null,
      verified_by_name = null
  where id = p_session;

  perform public.log_session_event(
    p_session, 'student',
    case when v_session.status = 'scheduled' then 'submitted' else 'resubmitted' end,
    v_session.status, 'pending_verification',
    jsonb_build_object(
      'actual_minutes', p_actual_minutes,
      'previous_actual_minutes', v_session.actual_minutes
    )
  );
end;
$$;

-- The learner says whether they'd like an upcoming session. Saying no
-- cancels it: taking part is always their choice.
create or replace function public.learner_session_response(
  p_session uuid,
  p_wants_session boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.community_sessions;
begin
  select * into v_session from public.community_sessions
  where id = p_session and learner_id = auth.uid()
  for update;
  if v_session.id is null then
    raise exception 'Session not found.';
  end if;
  if v_session.status not in ('pending_approval', 'invited', 'scheduled')
     or v_session.scheduled_at <= now() then
    raise exception 'This session can''t be changed now.';
  end if;

  if p_wants_session then
    update public.community_sessions set learner_response = 'yes' where id = p_session;
    perform public.log_session_event(p_session, 'learner', 'learner_yes', v_session.status, v_session.status);
  else
    update public.community_sessions
    set learner_response = 'no', status = 'canceled'
    where id = p_session;
    perform public.log_session_event(p_session, 'learner', 'learner_declined', v_session.status, 'canceled');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------
revoke all on function public.create_student_invitation(text) from public, anon;
revoke all on function public.revoke_student_invitation(uuid) from public, anon;
revoke all on function public.redeem_student_invitation(text, text, boolean, boolean, text) from public, anon;
revoke all on function public.remove_community_student(uuid) from public, anon;
revoke all on function public.set_student_learner_access(uuid, uuid, boolean) from public, anon;
revoke all on function public.my_student_communities() from public, anon;
revoke all on function public.leave_community(uuid) from public, anon;
revoke all on function public.update_student_profile(text, text, text, text) from public, anon;
revoke all on function public.caregiver_create_session(uuid, uuid, text, text, text, text, timestamptz, integer, boolean) from public, anon;
revoke all on function public.student_request_session(uuid, text, text, text, timestamptz, integer) from public, anon;
revoke all on function public.caregiver_update_session(uuid, timestamptz, integer, text) from public, anon;
revoke all on function public.caregiver_session_action(uuid, text, text) from public, anon;
revoke all on function public.student_session_action(uuid, text) from public, anon;
revoke all on function public.student_submit_hours(uuid, integer, text) from public, anon;
revoke all on function public.learner_session_response(uuid, boolean) from public, anon;

grant execute on function public.create_student_invitation(text) to authenticated;
grant execute on function public.revoke_student_invitation(uuid) to authenticated;
grant execute on function public.redeem_student_invitation(text, text, boolean, boolean, text) to authenticated;
grant execute on function public.remove_community_student(uuid) to authenticated;
grant execute on function public.set_student_learner_access(uuid, uuid, boolean) to authenticated;
grant execute on function public.my_student_communities() to authenticated;
grant execute on function public.leave_community(uuid) to authenticated;
grant execute on function public.update_student_profile(text, text, text, text) to authenticated;
grant execute on function public.caregiver_create_session(uuid, uuid, text, text, text, text, timestamptz, integer, boolean) to authenticated;
grant execute on function public.student_request_session(uuid, text, text, text, timestamptz, integer) to authenticated;
grant execute on function public.caregiver_update_session(uuid, timestamptz, integer, text) to authenticated;
grant execute on function public.caregiver_session_action(uuid, text, text) to authenticated;
grant execute on function public.student_session_action(uuid, text) to authenticated;
grant execute on function public.student_submit_hours(uuid, integer, text) to authenticated;
grant execute on function public.learner_session_response(uuid, boolean) to authenticated;
