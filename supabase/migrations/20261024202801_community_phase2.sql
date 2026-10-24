-- Community Skill Exchange, phase 2.
--
-- 1. Meeting links. Caregivers add a Zoom / Google Meet / Teams / Webex /
--    Jitsi / Whereby link to a session. Only https links on those hosts are
--    accepted (no other sites, no user:password@ tricks), so a link can't
--    send an older adult somewhere unexpected. Links are only readable by
--    the session's participants (existing RLS) and are never written to the
--    audit history.
-- 2. Session length by plan. Free caregivers plan up to 30 minutes; with an
--    active GoldenGuide Family membership, up to 2 hours. Checked in the
--    database (max_planned_minutes). Both sides still agree to every
--    session, and sessions already agreed keep their length if the plan
--    ends. Each session records whether it was booked on Family.
-- 3. Session notes. A student writes notes and next steps (up to 2,000 and
--    1,000 characters) for their own sessions. They're private until the
--    student shares them; then the session's caregiver and learner can read
--    them. Admins can't read notes.
-- 4. Verification. The learner can now confirm or dispute the time a
--    student logged, as well as the caregiver. A student can report that a
--    session didn't happen. Disputed sessions are flagged for the owner to
--    review in Admin. Overlapping sessions for the same student or learner
--    are refused, so the same time can't be credited twice.
-- 5. Admin: Community statistics for the owner (no note contents).

-- ---------------------------------------------------------------------------
-- new session columns
-- ---------------------------------------------------------------------------
alter table public.community_sessions
  add column if not exists meeting_url text
    check (meeting_url is null or (length(meeting_url) <= 500 and meeting_url like 'https://%')),
  add column if not exists premium_at_booking boolean not null default false,
  add column if not exists verified_by_role text
    check (verified_by_role in ('caregiver', 'learner', 'admin')),
  add column if not exists admin_reviewed_at timestamptz,
  add column if not exists admin_note text not null default '' check (length(admin_note) <= 1000);

-- Phase 1 verifications were all by caregivers.
update public.community_sessions
set verified_by_role = 'caregiver'
where status = 'verified' and verified_by_role is null;

-- ---------------------------------------------------------------------------
-- 1. meeting links
-- ---------------------------------------------------------------------------

-- The provider for an allowed meeting link, or null if the link isn't one.
create or replace function public.meeting_provider(p_url text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_url text := trim(coalesce(p_url, ''));
  v_authority text;
  v_host text;
begin
  if v_url !~* '^https://[^\s]+$' or length(v_url) > 500 then
    return null;
  end if;
  v_authority := lower(substring(v_url from '^https://([^/?#]+)'));
  -- No user:password@host links, and no custom ports.
  if v_authority is null or v_authority ~ '[@:\\]' then
    return null;
  end if;
  v_host := v_authority;

  return case
    when v_host = 'zoom.us' or v_host ~ '^[a-z0-9-]+\.zoom\.us$' then 'zoom'
    when v_host = 'meet.google.com' then 'google_meet'
    when v_host in ('teams.microsoft.com', 'teams.live.com') then 'teams'
    when v_host ~ '^([a-z0-9-]+\.)?webex\.com$' then 'webex'
    when v_host = 'meet.jit.si' then 'jitsi'
    when v_host = 'whereby.com' or v_host ~ '^[a-z0-9-]+\.whereby\.com$' then 'whereby'
    else null
  end;
end;
$$;

-- The tidy link to store, or an error explaining what's accepted.
create or replace function public.clean_meeting_url(p_url text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_url text := nullif(trim(coalesce(p_url, '')), '');
begin
  if v_url is null then
    return null;
  end if;
  if public.meeting_provider(v_url) is null then
    raise exception 'Please paste a meeting link that starts with https:// from Zoom, Google Meet, Microsoft Teams, Webex, Jitsi Meet or Whereby.';
  end if;
  return v_url;
end;
$$;

grant execute on function public.meeting_provider(text) to authenticated;

-- Plan a session with its meeting link in one step.
create or replace function public.caregiver_plan_session(
  p_student uuid,
  p_learner uuid,
  p_topic text,
  p_description text,
  p_join_details text,
  p_meeting_url text,
  p_scheduled_at timestamptz,
  p_planned_minutes integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := public.clean_meeting_url(p_meeting_url);
  v_id uuid;
begin
  v_id := public.caregiver_create_session(
    p_student, p_learner, p_topic, p_description, 'remote', p_join_details,
    p_scheduled_at, p_planned_minutes, false
  );
  if v_url is not null then
    update public.community_sessions set meeting_url = v_url where id = v_id;
  end if;
  return v_id;
end;
$$;

-- Add, change or remove a session's meeting link, any time before it ends.
create or replace function public.caregiver_set_meeting_link(p_session uuid, p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.community_sessions;
  v_url text := public.clean_meeting_url(p_url);
begin
  select * into v_session from public.community_sessions
  where id = p_session and caregiver_id = auth.uid()
  for update;
  if v_session.id is null then
    raise exception 'Session not found.';
  end if;
  if v_session.status not in ('pending_approval', 'invited', 'scheduled')
     or v_session.scheduled_at + make_interval(mins => v_session.planned_minutes) <= now() then
    raise exception 'This session has ended, so its meeting link can''t be changed.';
  end if;

  update public.community_sessions set meeting_url = v_url where id = p_session;
  -- The link itself is never written to the history.
  perform public.log_session_event(
    p_session, 'caregiver',
    case when v_url is null then 'meeting_link_removed' else 'meeting_link_set' end,
    v_session.status, v_session.status,
    case when v_url is null then '{}'::jsonb
         else jsonb_build_object('provider', public.meeting_provider(v_url)) end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. session length by plan
-- ---------------------------------------------------------------------------

-- Longest session a caregiver can plan: 2 hours on GoldenGuide Family,
-- 30 minutes otherwise. This is the only place the plan decides it.
create or replace function public.max_planned_minutes(p_caregiver uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when public.caregiver_has_family(p_caregiver) then 120 else 30 end;
$$;

revoke all on function public.max_planned_minutes(uuid) from public, anon, authenticated;

-- A student's communities, now with each caregiver's longest session.
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
      'max_minutes', public.max_planned_minutes(m.caregiver_id),
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

-- The signed-in caregiver's longest session, for the planning form.
create or replace function public.my_max_session_minutes()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select public.max_planned_minutes(auth.uid());
$$;

revoke all on function public.my_max_session_minutes() from public, anon;
grant execute on function public.my_max_session_minutes() to authenticated;

-- ---------------------------------------------------------------------------
-- safety trigger: remote only, approved students, no double-booking,
-- plan recorded at booking
-- ---------------------------------------------------------------------------
create or replace function public.enforce_session_safety()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window tstzrange;
begin
  if tg_op = 'INSERT' and new.format <> 'remote' then
    raise exception 'In-person sessions aren''t available yet. Please plan a video or phone session.';
  end if;

  if new.status in ('pending_approval', 'invited', 'scheduled')
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and not public.student_cleared(new.student_id) then
    raise exception 'This student is waiting for a parent or guardian to approve them.';
  end if;

  if tg_op = 'INSERT' then
    new.premium_at_booking := public.caregiver_has_family(new.caregiver_id);
  end if;

  -- The same person can't be in two sessions at once, so the same time
  -- can't be credited twice.
  if new.status in ('pending_approval', 'invited', 'scheduled')
     and (
       tg_op = 'INSERT'
       or old.scheduled_at is distinct from new.scheduled_at
       or old.planned_minutes is distinct from new.planned_minutes
       or old.status is distinct from new.status
     ) then
    v_window := tstzrange(new.scheduled_at, new.scheduled_at + make_interval(mins => new.planned_minutes));
    if exists (
      select 1 from public.community_sessions s
      where s.id <> new.id
        and (s.student_id = new.student_id or s.learner_id = new.learner_id)
        and s.status in ('pending_approval', 'invited', 'scheduled', 'pending_verification', 'correction_requested', 'verified')
        and tstzrange(s.scheduled_at, s.scheduled_at + make_interval(mins => s.planned_minutes)) && v_window
    ) then
      raise exception 'This time overlaps another session for the student or learner. Please choose a different time.';
    end if;
  end if;

  -- Who verified a record is kept only while it's verified.
  if tg_op = 'UPDATE' then
    if new.status = 'verified' and old.status is distinct from 'verified' and new.verified_by_role is null then
      new.verified_by_role := 'caregiver';
    elsif new.status <> 'verified' then
      new.verified_by_role := null;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_session_safety() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. session notes
-- ---------------------------------------------------------------------------
create table if not exists public.session_notes (
  session_id uuid primary key references public.community_sessions (id) on delete cascade,
  student_id uuid not null references public.student_profiles (id) on delete cascade,
  -- Hard ceilings; community_note_limit() sets the working limit.
  body text not null default '' check (length(body) <= 4000),
  next_steps text not null default '' check (length(next_steps) <= 2000),
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.session_notes enable row level security;

create index if not exists session_notes_student_id_idx on public.session_notes (student_id);

drop trigger if exists session_notes_set_updated_at on public.session_notes;
create trigger session_notes_set_updated_at
  before update on public.session_notes
  for each row execute function public.set_updated_at();

-- The student always; the session's caregiver and learner once shared.
drop policy if exists "session_notes_select" on public.session_notes;
create policy "session_notes_select" on public.session_notes
  for select to authenticated
  using (
    student_id = auth.uid()
    or (
      shared_at is not null
      and exists (
        select 1 from public.community_sessions s
        where s.id = session_notes.session_id
          and (s.caregiver_id = auth.uid() or s.learner_id = auth.uid())
      )
    )
  );

-- Character limits for notes. Kept short so they stay easy to read and
-- light on storage.
create or replace function public.community_note_limit()
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object('body', 2000, 'next_steps', 1000);
$$;

grant execute on function public.community_note_limit() to authenticated;

create or replace function public.save_session_notes(
  p_session uuid,
  p_body text,
  p_next_steps text,
  p_shared boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.community_sessions;
  v_body text := trim(coalesce(p_body, ''));
  v_next text := trim(coalesce(p_next_steps, ''));
  v_limits jsonb := public.community_note_limit();
  v_old public.session_notes;
  v_row public.session_notes;
begin
  select * into v_session from public.community_sessions
  where id = p_session and student_id = auth.uid();
  if v_session.id is null then
    raise exception 'Session not found.';
  end if;
  if v_session.status not in ('scheduled', 'pending_verification', 'correction_requested', 'verified', 'disputed') then
    raise exception 'You can write notes once a session is scheduled.';
  end if;
  if length(v_body) > (v_limits ->> 'body')::int then
    raise exception 'Notes can be up to % characters.', v_limits ->> 'body';
  end if;
  if length(v_next) > (v_limits ->> 'next_steps')::int then
    raise exception 'Next steps can be up to % characters.', v_limits ->> 'next_steps';
  end if;

  select * into v_old from public.session_notes where session_id = p_session for update;

  insert into public.session_notes (session_id, student_id, body, next_steps, shared_at)
  values (
    p_session, auth.uid(), v_body, v_next,
    case when coalesce(p_shared, false) then now() end
  )
  on conflict (session_id) do update
  set body = excluded.body,
      next_steps = excluded.next_steps,
      -- Keep the first share time while it stays shared.
      shared_at = case
        when coalesce(p_shared, false) then coalesce(public.session_notes.shared_at, now())
        else null
      end
  returning * into v_row;

  if (v_old.shared_at is null) <> (v_row.shared_at is null) then
    perform public.log_session_event(
      p_session, 'student',
      case when v_row.shared_at is null then 'notes_unshared' else 'notes_shared' end,
      v_session.status, v_session.status
    );
  end if;

  return jsonb_build_object('saved_at', v_row.updated_at, 'shared', v_row.shared_at is not null);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. verification
-- ---------------------------------------------------------------------------

-- The learner confirms or disputes the time a student logged.
create or replace function public.learner_confirm_session(
  p_session uuid,
  p_confirm boolean,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.community_sessions;
  v_note text := left(trim(coalesce(p_note, '')), 1000);
begin
  select * into v_session from public.community_sessions
  where id = p_session and learner_id = auth.uid()
  for update;
  if v_session.id is null then
    raise exception 'Session not found.';
  end if;
  if v_session.status <> 'pending_verification' then
    raise exception 'There''s nothing to confirm for this session right now.';
  end if;

  if p_confirm then
    update public.community_sessions
    set status = 'verified',
        verified_at = now(),
        verified_by_name = (select p.full_name from public.profiles p where p.id = auth.uid()),
        verified_by_role = 'learner'
    where id = p_session;
    perform public.log_session_event(
      p_session, 'learner', 'learner_confirmed', v_session.status, 'verified',
      jsonb_build_object('actual_minutes', v_session.actual_minutes)
    );
  else
    update public.community_sessions set status = 'disputed' where id = p_session;
    perform public.log_session_event(
      p_session, 'learner', 'learner_disputed', v_session.status, 'disputed',
      case when v_note = '' then '{}'::jsonb else jsonb_build_object('note', v_note) end
    );
  end if;
end;
$$;

-- The student reports that a scheduled session didn't happen.
create or replace function public.student_report_not_held(p_session uuid, p_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.community_sessions;
  v_note text := left(trim(coalesce(p_note, '')), 1000);
begin
  select * into v_session from public.community_sessions
  where id = p_session and student_id = auth.uid()
  for update;
  if v_session.id is null then
    raise exception 'Session not found.';
  end if;
  if v_session.status <> 'scheduled' or v_session.scheduled_at > now() then
    raise exception 'You can only report this after a scheduled session''s start time.';
  end if;

  update public.community_sessions set status = 'canceled' where id = p_session;
  perform public.log_session_event(
    p_session, 'student', 'not_held', 'scheduled', 'canceled',
    case when v_note = '' then '{}'::jsonb else jsonb_build_object('note', v_note) end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. owner admin
-- ---------------------------------------------------------------------------
create or replace function public.admin_community_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return jsonb_build_object(
    'students', (select count(*) from public.student_profiles),
    'students_waiting_for_parent', (select count(*) from public.student_profiles where guardian_status = 'pending'),
    'active_memberships', (select count(*) from public.community_members where status = 'active'),
    'sessions_upcoming', (
      select count(*) from public.community_sessions
      where status in ('pending_approval', 'invited', 'scheduled') and scheduled_at > now()
    ),
    'sessions_awaiting_confirmation', (
      select count(*) from public.community_sessions where status in ('pending_verification', 'correction_requested')
    ),
    'sessions_verified', (select count(*) from public.community_sessions where status = 'verified'),
    'sessions_canceled', (select count(*) from public.community_sessions where status in ('canceled', 'rejected')),
    'sessions_disputed_open', (
      select count(*) from public.community_sessions where status = 'disputed' and admin_reviewed_at is null
    ),
    'verified_minutes', (
      select coalesce(sum(actual_minutes), 0) from public.community_sessions where status = 'verified'
    ),
    'average_verified_minutes', (
      select coalesce(round(avg(actual_minutes)), 0) from public.community_sessions where status = 'verified'
    ),
    'sessions_free', (select count(*) from public.community_sessions where not premium_at_booking),
    'sessions_family', (select count(*) from public.community_sessions where premium_at_booking),
    'sessions_over_30_minutes', (select count(*) from public.community_sessions where planned_minutes > 30),
    'verified_by', (
      select coalesce(jsonb_object_agg(verified_by_role, c), '{}'::jsonb)
      from (
        select verified_by_role, count(*) as c from public.community_sessions
        where status = 'verified' group by verified_by_role
      ) t
    ),
    'family_caregivers_in_community', (
      select count(distinct m.caregiver_id) from public.community_members m
      where m.status = 'active' and public.caregiver_has_family(m.caregiver_id)
    ),
    'caregivers_in_community', (
      select count(distinct m.caregiver_id) from public.community_members m where m.status = 'active'
    )
  );
end;
$$;

-- Disputed sessions for the owner to review: facts only, never notes.
create or replace function public.admin_disputed_sessions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'topic', s.topic,
        'scheduled_at', s.scheduled_at,
        'planned_minutes', s.planned_minutes,
        'actual_minutes', s.actual_minutes,
        'student_name', s.student_name,
        'caregiver_name', public.first_name(s.caregiver_name),
        'learner_name', s.learner_name,
        'reviewed', s.admin_reviewed_at is not null,
        'admin_note', s.admin_note,
        'history', (
          select jsonb_agg(
            jsonb_build_object(
              'actor_role', e.actor_role, 'event', e.event,
              'note', e.details ->> 'note', 'minutes', e.details ->> 'actual_minutes',
              'created_at', e.created_at
            ) order by e.created_at
          )
          from public.session_events e where e.session_id = s.id
        )
      ) order by s.admin_reviewed_at nulls first, s.updated_at desc
    )
    from public.community_sessions s
    where s.status = 'disputed'
       or (s.admin_reviewed_at is not null and s.updated_at > now() - interval '30 days')
  ), '[]'::jsonb);
end;
$$;

-- The owner settles a disputed record: verify the time, or keep it
-- disputed (not counted). Either way the decision is logged.
create or replace function public.admin_resolve_session(
  p_session uuid,
  p_verify boolean,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.community_sessions;
  v_note text := left(trim(coalesce(p_note, '')), 1000);
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if v_note = '' then
    raise exception 'Please add a short note explaining the decision.';
  end if;

  select * into v_session from public.community_sessions where id = p_session for update;
  if v_session.id is null or v_session.status <> 'disputed' then
    raise exception 'Only disputed sessions can be reviewed here.';
  end if;

  update public.community_sessions
  set status = case when p_verify then 'verified' else 'disputed' end,
      verified_at = case when p_verify then now() else verified_at end,
      verified_by_name = case when p_verify then 'GoldenGuide review' else verified_by_name end,
      verified_by_role = case when p_verify then 'admin' else verified_by_role end,
      admin_reviewed_at = now(),
      admin_note = v_note
  where id = p_session;

  insert into public.session_events (session_id, actor_id, actor_role, event, from_status, to_status, details)
  values (
    -- An admin account may not have a GoldenGuide profile.
    p_session, (select p.id from public.profiles p where p.id = auth.uid()), 'admin',
    case when p_verify then 'admin_verified' else 'admin_upheld_dispute' end,
    'disputed', case when p_verify then 'verified' else 'disputed' end,
    jsonb_build_object('note', v_note)
  );
end;
$$;

alter table public.session_events drop constraint if exists session_events_actor_role_check;
alter table public.session_events add constraint session_events_actor_role_check
  check (actor_role in ('caregiver', 'student', 'learner', 'admin'));

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------
revoke all on function public.clean_meeting_url(text) from public, anon, authenticated;
revoke all on function public.caregiver_plan_session(uuid, uuid, text, text, text, text, timestamptz, integer) from public, anon;
revoke all on function public.caregiver_set_meeting_link(uuid, text) from public, anon;
revoke all on function public.save_session_notes(uuid, text, text, boolean) from public, anon;
revoke all on function public.learner_confirm_session(uuid, boolean, text) from public, anon;
revoke all on function public.student_report_not_held(uuid, text) from public, anon;
revoke all on function public.admin_community_stats() from public, anon;
revoke all on function public.admin_disputed_sessions() from public, anon;
revoke all on function public.admin_resolve_session(uuid, boolean, text) from public, anon;

grant execute on function public.caregiver_plan_session(uuid, uuid, text, text, text, text, timestamptz, integer) to authenticated;
grant execute on function public.caregiver_set_meeting_link(uuid, text) to authenticated;
grant execute on function public.save_session_notes(uuid, text, text, boolean) to authenticated;
grant execute on function public.learner_confirm_session(uuid, boolean, text) to authenticated;
grant execute on function public.student_report_not_held(uuid, text) to authenticated;
grant execute on function public.admin_community_stats() to authenticated;
grant execute on function public.admin_disputed_sessions() to authenticated;
grant execute on function public.admin_resolve_session(uuid, boolean, text) to authenticated;
