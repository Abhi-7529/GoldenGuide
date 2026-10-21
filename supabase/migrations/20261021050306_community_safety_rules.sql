-- Community Skill Exchange safety rules, before launch.
--
-- 1. Student volunteers must be 16 or older. Students who are 16 or 17 need
--    a parent or guardian's approval before they can work with any family:
--    the server emails the parent a link (create_guardian_consent, service
--    role only, so a student can never see their own approval link), and
--    the parent approves or declines on a public page with that link.
--    Until then, triggers stop anyone from giving the student access to a
--    learner or putting them in an upcoming session.
-- 2. Sessions are remote only for now. A trigger refuses new in-person
--    sessions; the column stays so the option can come back later.
--
-- redeem_student_invitation() now takes the student's age group instead of
-- the two checkboxes. The checkbox timestamps stay for existing rows.

-- ---------------------------------------------------------------------------
-- 1. age group and parent or guardian approval
-- ---------------------------------------------------------------------------
alter table public.student_profiles
  add column if not exists age_group text check (age_group in ('16_17', '18_plus')),
  add column if not exists guardian_status text not null default 'not_needed'
    check (guardian_status in ('not_needed', 'pending', 'approved', 'declined'));

alter table public.student_profiles alter column guardian_ack_at drop not null;

-- Parent emails live here, not on student_profiles, so caregivers (who can
-- read a student's profile) never see them.
create table if not exists public.guardian_consents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles (id) on delete cascade,
  guardian_email text not null check (
    length(guardian_email) <= 254
    and guardian_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  decision text check (decision in ('approved', 'declined')),
  guardian_name text check (length(guardian_name) <= 100),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.guardian_consents enable row level security;

create index if not exists guardian_consents_student_id_idx
  on public.guardian_consents (student_id, created_at desc);

drop policy if exists "guardian_consents_select_own" on public.guardian_consents;
create policy "guardian_consents_select_own" on public.guardian_consents
  for select to authenticated
  using (student_id = auth.uid());

-- Whether a student may work with families: 18 or older, or approved by a
-- parent or guardian.
create or replace function public.student_cleared(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.student_profiles sp
    where sp.id = p_student
      and (sp.age_group = '18_plus' or sp.guardian_status = 'approved')
  );
$$;

revoke all on function public.student_cleared(uuid) from public, anon, authenticated;

-- No learner access for a student who isn't cleared yet.
create or replace function public.enforce_student_cleared_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.student_cleared(new.student_id) then
    raise exception 'This student is waiting for a parent or guardian to approve them.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_student_cleared_access() from public, anon, authenticated;

drop trigger if exists community_learner_access_cleared on public.community_learner_access;
create trigger community_learner_access_cleared
  before insert on public.community_learner_access
  for each row execute function public.enforce_student_cleared_access();

-- Sessions: only cleared students can be asked, invited or scheduled, and
-- new sessions are remote. Logging time for a session that already
-- happened isn't affected.
create or replace function public.enforce_session_safety()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.format <> 'remote' then
    raise exception 'In-person sessions aren''t available yet. Please plan a video or phone session.';
  end if;

  if new.status in ('pending_approval', 'invited', 'scheduled')
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and not public.student_cleared(new.student_id) then
    raise exception 'This student is waiting for a parent or guardian to approve them.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_session_safety() from public, anon, authenticated;

drop trigger if exists community_sessions_safety on public.community_sessions;
create trigger community_sessions_safety
  before insert or update on public.community_sessions
  for each row execute function public.enforce_session_safety();

-- ---------------------------------------------------------------------------
-- redeem_student_invitation: age group instead of checkboxes
-- ---------------------------------------------------------------------------
drop function if exists public.redeem_student_invitation(text, text, boolean, boolean, text);

create or replace function public.redeem_student_invitation(
  p_code text,
  p_display_name text default null,
  p_age_group text default null,
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
    if p_age_group is null or p_age_group not in ('16_17', '18_plus') then
      return jsonb_build_object('ok', false, 'error', 'Student volunteers need to be 16 or older.');
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
    return jsonb_build_object('ok', false, 'error', 'You''re already part of this family''s community.');
  end if;

  if v_role is null then
    insert into public.profiles (id, role, full_name, time_zone)
    values (v_uid, 'student', v_name, p_time_zone);
    insert into public.student_profiles (id, display_name, age_confirmed_at, age_group, guardian_status)
    values (
      v_uid, v_name, now(), p_age_group,
      case when p_age_group = '16_17' then 'pending' else 'not_needed' end
    );
  end if;

  if v_member.id is null then
    insert into public.community_members (caregiver_id, student_id)
    values (v_invite.caregiver_id, v_uid);
  else
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

  return jsonb_build_object(
    'ok', true,
    'caregiver_name', v_caregiver_name,
    'needs_guardian', (select sp.guardian_status in ('pending', 'declined') from public.student_profiles sp where sp.id = v_uid)
  );
end;
$$;

revoke all on function public.redeem_student_invitation(text, text, text, text) from public, anon;
grant execute on function public.redeem_student_invitation(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- parent or guardian approval
-- ---------------------------------------------------------------------------

-- Makes an approval link for a 16- or 17-year-old student and returns its
-- token. Only the server (service role) can call this, after checking who
-- is signed in, so the token only ever goes to the parent's inbox.
create or replace function public.create_guardian_consent(p_student uuid, p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_profile public.student_profiles;
  v_token text;
begin
  select * into v_profile from public.student_profiles where id = p_student for update;
  if v_profile.id is null or v_profile.age_group is distinct from '16_17' then
    raise exception 'Only student volunteers who are 16 or 17 need a parent''s approval.';
  end if;
  if v_profile.guardian_status = 'approved' then
    raise exception 'A parent or guardian has already approved you.';
  end if;
  if v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 254 then
    raise exception 'Please enter a valid email address.';
  end if;
  if v_email = lower((select u.email from auth.users u where u.id = p_student)) then
    raise exception 'Please enter your parent or guardian''s email, not your own.';
  end if;
  if (
    select count(*) from public.guardian_consents g
    where g.student_id = p_student and g.created_at > now() - interval '1 day'
  ) >= 3 then
    raise exception 'We''ve sent 3 emails today. Please try again tomorrow.';
  end if;

  -- Only the newest link works.
  update public.guardian_consents
  set expires_at = now()
  where student_id = p_student and decided_at is null and expires_at > now();

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.guardian_consents (student_id, guardian_email, token_hash, expires_at)
  values (p_student, v_email, sha256(convert_to(v_token, 'UTF8')), now() + interval '14 days');

  update public.student_profiles set guardian_status = 'pending' where id = p_student;
  return v_token;
end;
$$;

revoke all on function public.create_guardian_consent(uuid, text) from public, anon, authenticated;
grant execute on function public.create_guardian_consent(uuid, text) to service_role;

-- What the approval page shows for a link: whether it can still be used,
-- and the student's name. Anyone with the link can see this much.
create or replace function public.guardian_consent_preview(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'state', case
          when g.decided_at is not null then 'decided'
          when g.expires_at <= now() then 'expired'
          else 'open'
        end,
        'decision', g.decision,
        'student_name', sp.display_name
      )
      from public.guardian_consents g
      join public.student_profiles sp on sp.id = g.student_id
      where g.token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'))
    ),
    jsonb_build_object('state', 'invalid')
  );
$$;

-- The parent approves (typing their name) or declines.
create or replace function public.guardian_consent_respond(
  p_token text,
  p_approve boolean,
  p_guardian_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consent public.guardian_consents;
  v_name text := trim(coalesce(p_guardian_name, ''));
begin
  select * into v_consent
  from public.guardian_consents g
  where g.token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'))
  for update;

  if v_consent.id is null or v_consent.decided_at is not null or v_consent.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'This link can''t be used any more. Ask the student to send a new one.');
  end if;
  if p_approve and (length(v_name) < 1 or length(v_name) > 100) then
    return jsonb_build_object('ok', false, 'error', 'Please type your full name to approve.');
  end if;

  update public.guardian_consents
  set decision = case when p_approve then 'approved' else 'declined' end,
      guardian_name = nullif(v_name, ''),
      decided_at = now()
  where id = v_consent.id;

  update public.student_profiles
  set guardian_status = case when p_approve then 'approved' else 'declined' end
  where id = v_consent.student_id;

  return jsonb_build_object('ok', true, 'decision', case when p_approve then 'approved' else 'declined' end);
end;
$$;

revoke all on function public.guardian_consent_preview(text) from public;
revoke all on function public.guardian_consent_respond(text, boolean, text) from public;
grant execute on function public.guardian_consent_preview(text) to anon, authenticated;
grant execute on function public.guardian_consent_respond(text, boolean, text) to anon, authenticated;
