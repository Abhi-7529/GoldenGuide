-- Permission tests for Community Skill Exchange phase 2
-- (migration 20261024202801_community_phase2): meeting links, session
-- length by plan, session notes, learner confirmation and owner review.
--
-- Runs inside one transaction that is rolled back, like
-- community_exchange.sql, and uses the same helpers.
--
--   npx supabase db query --linked -f supabase/tests/community_phase2.sql
--
-- To test before the migration is pushed, put its contents right after
-- "begin;".

begin;

-- @tests-start marker below).

begin;

-- @tests-start
create temp table t_results (
  n serial primary key,
  label text not null,
  pass boolean not null,
  detail text
);
create temp table t_ids (name text primary key, id uuid, code text);
grant all on t_results, t_ids to authenticated, anon;
grant usage on sequence t_results_n_seq to authenticated, anon;

-- Runs one statement as a user (anon when p_uid is null) and returns its
-- single value as text, or 'ERR: <message>'.
create function pg_temp.run(p_uid uuid, p_sql text)
returns text
language plpgsql
as $f$
declare
  v text;
begin
  if p_uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
  else
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', p_uid, 'role', 'authenticated')::text,
      true
    );
    set local role authenticated;
  end if;
  begin
    execute p_sql into v;
  exception when others then
    v := 'ERR: ' || sqlerrm;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return coalesce(v, '');
end;
$f$;

create function pg_temp.check(p_label text, p_pass boolean, p_detail text default null)
returns void
language sql
as $f$
  insert into t_results (label, pass, detail) values (p_label, coalesce(p_pass, false), p_detail);
$f$;

create function pg_temp.ok(p_label text, p_result text)
returns void
language sql
as $f$
  select pg_temp.check(p_label, p_result not like 'ERR:%', p_result);
$f$;

create function pg_temp.err(p_label text, p_result text, p_contains text default '')
returns void
language sql
as $f$
  select pg_temp.check(
    p_label,
    p_result like 'ERR:%' and p_result ilike '%' || p_contains || '%',
    p_result
  );
$f$;

create function pg_temp.eq(p_label text, p_result text, p_expected text)
returns void
language sql
as $f$
  select pg_temp.check(p_label, p_result = p_expected, p_result || ' (expected ' || p_expected || ')');
$f$;

create function pg_temp.sid(p_name text)
returns uuid
language sql
as $f$
  select id from t_ids where name = p_name;
$f$;

-- ---------------------------------------------------------------------------
-- setup (as the database owner)
-- ---------------------------------------------------------------------------
-- d...0a Alice (Family) with learner Lou; d...0b Bob (Free) with learner Lee
-- d...5e1 Sky (student with Alice, can help Lou); d...5e2 Sid (with Bob)
-- d...ad1 an admin
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
select v.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'cse2-test-' || right(v.id, 3) || '@example.invalid', now(), now()
from (values
  ('d0000000-0000-4000-8000-00000000000a'),
  ('d0000000-0000-4000-8000-00000000000b'),
  ('d0000000-0000-4000-8000-0000000000a1'),
  ('d0000000-0000-4000-8000-0000000000b1'),
  ('d0000000-0000-4000-8000-0000000005e1'),
  ('d0000000-0000-4000-8000-0000000005e2'),
  ('d0000000-0000-4000-8000-000000000ad1')
) v (id);

insert into public.profiles (id, role, full_name) values
  ('d0000000-0000-4000-8000-00000000000a', 'caregiver', 'Alice Adams'),
  ('d0000000-0000-4000-8000-00000000000b', 'caregiver', 'Bob Brown'),
  ('d0000000-0000-4000-8000-0000000000a1', 'care_recipient', 'Lou Adams'),
  ('d0000000-0000-4000-8000-0000000000b1', 'care_recipient', 'Lee Brown'),
  ('d0000000-0000-4000-8000-0000000005e1', 'student', 'Sky Student'),
  ('d0000000-0000-4000-8000-0000000005e2', 'student', 'Sid Student');

insert into public.student_profiles (id, display_name, age_confirmed_at, age_group, guardian_status) values
  ('d0000000-0000-4000-8000-0000000005e1', 'Sky Student', now(), '18_plus', 'not_needed'),
  ('d0000000-0000-4000-8000-0000000005e2', 'Sid Student', now(), '18_plus', 'not_needed');

insert into public.memberships (caregiver_id, status, current_period_end)
values ('d0000000-0000-4000-8000-00000000000a', 'active', now() + interval '30 days');

insert into public.connections (caregiver_id, care_recipient_id) values
  ('d0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-0000000000a1'),
  ('d0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-0000000000b1');

insert into public.community_members (caregiver_id, student_id) values
  ('d0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-0000000005e1'),
  ('d0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-0000000005e2');

insert into public.community_learner_access (caregiver_id, student_id, learner_id) values
  ('d0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-0000000005e1', 'd0000000-0000-4000-8000-0000000000a1'),
  ('d0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-0000000005e2', 'd0000000-0000-4000-8000-0000000000b1');

insert into public.admins (user_id) values ('d0000000-0000-4000-8000-000000000ad1');

-- ---------------------------------------------------------------------------
-- 1. meeting links
-- ---------------------------------------------------------------------------
select pg_temp.eq('L supported links are recognized',
  (select string_agg(coalesce(public.meeting_provider(u), 'null'), ',' order by n)
   from unnest(array[
     'https://zoom.us/j/123456?pwd=abc',
     'https://us02web.zoom.us/j/123',
     'https://meet.google.com/abc-defg-hij',
     'https://teams.microsoft.com/l/meetup-join/xyz',
     'https://acme.webex.com/meet/pat',
     'https://meet.jit.si/GoldenGuideLou',
     'https://whereby.com/goldenguide'
   ]) with ordinality t(u, n)),
  'zoom,zoom,google_meet,teams,webex,jitsi,whereby');
select pg_temp.eq('L unsafe or unknown links are refused',
  (select string_agg(coalesce(public.meeting_provider(u), 'null'), ',' order by n)
   from unnest(array[
     'http://zoom.us/j/123',
     'https://evil.example.com/zoom',
     'https://zoom.us.evil.com/j/1',
     'https://user:pw@zoom.us/j/1',
     'https://evil.com@zoom.us/j/1',
     'https://zoom.us:8443/j/1',
     'javascript:alert(1)',
     'https://zoom.us/j/1 https://evil.com',
     ''
   ]) with ordinality t(u, n)),
  'null,null,null,null,null,null,null,null,null');

select pg_temp.err('D a Free caregiver can''t plan more than 30 minutes',
  pg_temp.run('d0000000-0000-4000-8000-00000000000b', $q$select public.caregiver_plan_session('d0000000-0000-4000-8000-0000000005e2', 'd0000000-0000-4000-8000-0000000000b1', 'Email', '', '', null, now() + interval '2 days', 45)::text$q$),
  'up to 30 minutes');
select pg_temp.err('L a bad link stops the session being planned',
  pg_temp.run('d0000000-0000-4000-8000-00000000000b', $q$select public.caregiver_plan_session('d0000000-0000-4000-8000-0000000005e2', 'd0000000-0000-4000-8000-0000000000b1', 'Email', '', '', 'https://evil.example.com/x', now() + interval '2 days', 30)::text$q$),
  'Please paste a meeting link');
select pg_temp.eq('L ...and nothing was saved',
  (select count(*)::text from public.community_sessions where caregiver_id = 'd0000000-0000-4000-8000-00000000000b'), '0');

insert into t_ids (name, id)
select 'P1', pg_temp.run('d0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_plan_session('d0000000-0000-4000-8000-0000000005e1', 'd0000000-0000-4000-8000-0000000000a1', 'Video calls', '', 'Lou''s iPad', 'https://zoom.us/j/111', now() + interval '2 days', 120)::text$q$)::uuid;
select pg_temp.eq('D a Family caregiver can plan 2 hours, and it''s recorded as Family',
  (select planned_minutes || '/' || premium_at_booking || '/' || meeting_url from public.community_sessions where id = pg_temp.sid('P1')),
  '120/true/https://zoom.us/j/111');
select pg_temp.err('D ...but not more than 2 hours',
  pg_temp.run('d0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_plan_session('d0000000-0000-4000-8000-0000000005e1', 'd0000000-0000-4000-8000-0000000000a1', 'Banking', '', '', null, now() + interval '5 days', 121)::text$q$),
  'up to 120 minutes');
select pg_temp.eq('D students see each family''s longest session',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', $q$select (public.my_student_communities() -> 0 ->> 'max_minutes')$q$)
  || '/' || pg_temp.run('d0000000-0000-4000-8000-0000000005e2', $q$select (public.my_student_communities() -> 0 ->> 'max_minutes')$q$),
  '120/30');

select pg_temp.err('L Bob can''t change Alice''s meeting link',
  pg_temp.run('d0000000-0000-4000-8000-00000000000b', format($q$select public.caregiver_set_meeting_link(%L, 'https://meet.google.com/aaa-bbbb-ccc')::text$q$, pg_temp.sid('P1'))),
  'not found');
select pg_temp.ok('L Alice changes the link to Google Meet',
  pg_temp.run('d0000000-0000-4000-8000-00000000000a', format($q$select public.caregiver_set_meeting_link(%L, ' https://meet.google.com/aaa-bbbb-ccc ')::text$q$, pg_temp.sid('P1'))));
select pg_temp.eq('L the history never stores the link itself',
  (select count(*)::text from public.session_events where session_id = pg_temp.sid('P1') and details::text like '%https%'), '0');
select pg_temp.eq('L the student and learner can read the link; others can''t',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select meeting_url from public.community_sessions where id = %L$q$, pg_temp.sid('P1')))
  || ' / ' || pg_temp.run('d0000000-0000-4000-8000-0000000000a1', format($q$select meeting_url from public.community_sessions where id = %L$q$, pg_temp.sid('P1')))
  || ' / ' || pg_temp.run('d0000000-0000-4000-8000-0000000005e2', format($q$select count(*)::text from public.community_sessions where id = %L$q$, pg_temp.sid('P1')))
  || ' / ' || pg_temp.run('d0000000-0000-4000-8000-0000000000b1', format($q$select count(*)::text from public.community_sessions where id = %L$q$, pg_temp.sid('P1')))
  || ' / ' || pg_temp.run(null, format($q$select count(*)::text from public.community_sessions where id = %L$q$, pg_temp.sid('P1'))),
  'https://meet.google.com/aaa-bbbb-ccc / https://meet.google.com/aaa-bbbb-ccc / 0 / 0 / 0');
select pg_temp.eq('L a student can''t change the link directly',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$with u as (update public.community_sessions set meeting_url = 'https://zoom.us/j/999' where id = %L returning 1) select count(*)::text from u$q$, pg_temp.sid('P1'))),
  '0');
select pg_temp.ok('L Alice can remove the link',
  pg_temp.run('d0000000-0000-4000-8000-00000000000a', format($q$select public.caregiver_set_meeting_link(%L, '')::text$q$, pg_temp.sid('P1'))));
select pg_temp.eq('L ...and it''s gone',
  (select coalesce(meeting_url, 'none') from public.community_sessions where id = pg_temp.sid('P1')), 'none');

-- ---------------------------------------------------------------------------
-- 2. notes
-- ---------------------------------------------------------------------------
select pg_temp.err('N notes wait until the session is scheduled',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.save_session_notes(%L, 'Plan', '', false)::text$q$, pg_temp.sid('P1'))),
  'once a session is scheduled');
select pg_temp.ok('N Sky accepts the 2-hour session',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.student_session_action(%L, 'accept')::text$q$, pg_temp.sid('P1'))));
select pg_temp.ok('N Sky saves private notes',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.save_session_notes(%L, 'Lou answered a FaceTime call on his own.', 'Practice ending calls.', false)::text$q$, pg_temp.sid('P1'))));
select pg_temp.eq('N private notes: only Sky sees them',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', $q$select count(*)::text from public.session_notes$q$)
  || '/' || pg_temp.run('d0000000-0000-4000-8000-00000000000a', $q$select count(*)::text from public.session_notes$q$)
  || '/' || pg_temp.run('d0000000-0000-4000-8000-0000000000a1', $q$select count(*)::text from public.session_notes$q$),
  '1/0/0');
select pg_temp.err('N notes over 2,000 characters are refused',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.save_session_notes(%L, repeat('a', 2001), '', false)::text$q$, pg_temp.sid('P1'))),
  'up to 2000 characters');
select pg_temp.err('N Sid can''t write notes on Sky''s session',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e2', format($q$select public.save_session_notes(%L, 'x', '', true)::text$q$, pg_temp.sid('P1'))),
  'not found');
select pg_temp.err('N nobody can write notes directly',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$insert into public.session_notes (session_id, student_id, body) values (%L, 'd0000000-0000-4000-8000-0000000005e1', 'x') returning 1::text$q$, pg_temp.sid('P1'))),
  'row-level security');
select pg_temp.ok('N Sky shares her notes',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.save_session_notes(%L, 'Lou answered a FaceTime call on his own.', 'Practice ending calls.', true)::text$q$, pg_temp.sid('P1'))));
select pg_temp.eq('N shared notes: Alice and Lou see them, Bob and Sid don''t',
  pg_temp.run('d0000000-0000-4000-8000-00000000000a', $q$select count(*)::text from public.session_notes$q$)
  || '/' || pg_temp.run('d0000000-0000-4000-8000-0000000000a1', $q$select next_steps from public.session_notes$q$)
  || '/' || pg_temp.run('d0000000-0000-4000-8000-00000000000b', $q$select count(*)::text from public.session_notes$q$)
  || '/' || pg_temp.run('d0000000-0000-4000-8000-0000000005e2', $q$select count(*)::text from public.session_notes$q$),
  '1/Practice ending calls./0/0');
select pg_temp.ok('N Sky stops sharing',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.save_session_notes(%L, 'Lou answered a FaceTime call on his own.', 'Practice ending calls.', false)::text$q$, pg_temp.sid('P1'))));
select pg_temp.eq('N ...and Alice no longer sees them',
  pg_temp.run('d0000000-0000-4000-8000-00000000000a', $q$select count(*)::text from public.session_notes$q$), '0');
select pg_temp.eq('N sharing changes are logged, without the notes',
  (select string_agg(event, ',' order by created_at) from public.session_events where session_id = pg_temp.sid('P1') and event like 'notes%')
  || '/' || (select count(*)::text from public.session_events where session_id = pg_temp.sid('P1') and details::text like '%FaceTime%'),
  'notes_shared,notes_unshared/0');
select pg_temp.ok('N Sky shares again (for the admin check below)',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.save_session_notes(%L, 'Lou answered a FaceTime call on his own.', 'Practice ending calls.', true)::text$q$, pg_temp.sid('P1'))));

-- ---------------------------------------------------------------------------
-- 3. no double-booking, plan ending
-- ---------------------------------------------------------------------------
select pg_temp.err('V Sky can''t be booked twice at the same time',
  pg_temp.run('d0000000-0000-4000-8000-00000000000a', format($q$select public.caregiver_plan_session('d0000000-0000-4000-8000-0000000005e1', 'd0000000-0000-4000-8000-0000000000a1', 'Overlap', '', '', null, %L::timestamptz + interval '1 hour', 30)::text$q$, (select scheduled_at from public.community_sessions where id = pg_temp.sid('P1')))),
  'overlaps another session');

update public.memberships set status = 'canceled' where caregiver_id = 'd0000000-0000-4000-8000-00000000000a';
select pg_temp.err('D when Family ends, new sessions are 30 minutes again',
  pg_temp.run('d0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_plan_session('d0000000-0000-4000-8000-0000000005e1', 'd0000000-0000-4000-8000-0000000000a1', 'Banking', '', '', null, now() + interval '6 days', 60)::text$q$),
  'up to 30 minutes');
select pg_temp.eq('D ...but the 2-hour session already agreed stays',
  (select status || '/' || planned_minutes from public.community_sessions where id = pg_temp.sid('P1')), 'scheduled/120');

-- ---------------------------------------------------------------------------
-- 4. verification
-- ---------------------------------------------------------------------------
update public.community_sessions set scheduled_at = now() - interval '3 hours' where id = pg_temp.sid('P1');
select pg_temp.err('V nothing to confirm before the student logs time',
  pg_temp.run('d0000000-0000-4000-8000-0000000000a1', format($q$select public.learner_confirm_session(%L, true)::text$q$, pg_temp.sid('P1'))),
  'nothing to confirm');
select pg_temp.ok('V Sky logs 95 minutes',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.student_submit_hours(%L, 95, 'Video calls')::text$q$, pg_temp.sid('P1'))));
select pg_temp.err('V another learner can''t confirm it',
  pg_temp.run('d0000000-0000-4000-8000-0000000000b1', format($q$select public.learner_confirm_session(%L, true)::text$q$, pg_temp.sid('P1'))),
  'not found');
select pg_temp.err('V Sky can''t confirm her own time',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.learner_confirm_session(%L, true)::text$q$, pg_temp.sid('P1'))),
  'not found');
select pg_temp.ok('V Lou confirms',
  pg_temp.run('d0000000-0000-4000-8000-0000000000a1', format($q$select public.learner_confirm_session(%L, true)::text$q$, pg_temp.sid('P1'))));
select pg_temp.eq('V it''s verified by the learner and counts once',
  (select status || '/' || verified_by_role || '/' || verified_by_name from public.community_sessions where id = pg_temp.sid('P1'))
  || '/' || pg_temp.run('d0000000-0000-4000-8000-0000000005e1', $q$select sum(actual_minutes)::text from public.community_sessions where status = 'verified'$q$),
  'verified/learner/Lou Adams/95');
select pg_temp.err('V a verified session can''t be confirmed again',
  pg_temp.run('d0000000-0000-4000-8000-0000000000a1', format($q$select public.learner_confirm_session(%L, true)::text$q$, pg_temp.sid('P1'))),
  'nothing to confirm');

-- a second session the learner disputes
insert into t_ids (name, id)
select 'P2', pg_temp.run('d0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_plan_session('d0000000-0000-4000-8000-0000000005e1', 'd0000000-0000-4000-8000-0000000000a1', 'Scam texts', '', '', 'https://meet.jit.si/lou', now() + interval '1 day', 30)::text$q$)::uuid;
select pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.student_session_action(%L, 'accept')::text$q$, pg_temp.sid('P2')));
update public.community_sessions set scheduled_at = now() - interval '6 hours' where id = pg_temp.sid('P2');
select pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.student_submit_hours(%L, 30, 'Scam texts')::text$q$, pg_temp.sid('P2')));
select pg_temp.ok('V Lou says that''s not right',
  pg_temp.run('d0000000-0000-4000-8000-0000000000a1', format($q$select public.learner_confirm_session(%L, false, 'We only talked for 10 minutes')::text$q$, pg_temp.sid('P2'))));
select pg_temp.eq('V ...it''s disputed and not counted',
  (select status from public.community_sessions where id = pg_temp.sid('P2'))
  || '/' || pg_temp.run('d0000000-0000-4000-8000-0000000005e1', $q$select sum(actual_minutes)::text from public.community_sessions where status = 'verified'$q$),
  'disputed/95');

select pg_temp.err('A caregivers can''t see the owner''s Community stats',
  pg_temp.run('d0000000-0000-4000-8000-00000000000a', $q$select public.admin_community_stats()::text$q$), 'Not authorized');
select pg_temp.err('A students can''t either',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', $q$select public.admin_disputed_sessions()::text$q$), 'Not authorized');
select pg_temp.eq('A the owner sees the open dispute',
  pg_temp.run('d0000000-0000-4000-8000-000000000ad1', $q$select (public.admin_community_stats() ->> 'sessions_disputed_open')$q$), '1');
select pg_temp.check('A the dispute list shows facts and the learner''s reason, never session notes',
  pg_temp.run('d0000000-0000-4000-8000-000000000ad1', $q$select public.admin_disputed_sessions()::text$q$) like '%We only talked for 10 minutes%'
  and pg_temp.run('d0000000-0000-4000-8000-000000000ad1', $q$select public.admin_disputed_sessions()::text$q$) not like '%answered a FaceTime%');
select pg_temp.eq('A the owner can''t read session notes',
  pg_temp.run('d0000000-0000-4000-8000-000000000ad1', $q$select count(*)::text from public.session_notes$q$), '0');
select pg_temp.err('A a decision needs a note',
  pg_temp.run('d0000000-0000-4000-8000-000000000ad1', format($q$select public.admin_resolve_session(%L, false, '')::text$q$, pg_temp.sid('P2'))),
  'short note');
select pg_temp.ok('A the owner keeps it disputed',
  pg_temp.run('d0000000-0000-4000-8000-000000000ad1', format($q$select public.admin_resolve_session(%L, false, 'Learner and student disagree; not counted.')::text$q$, pg_temp.sid('P2'))));
select pg_temp.eq('A ...it''s marked reviewed and still not counted',
  (select status || '/' || (admin_reviewed_at is not null)::text from public.community_sessions where id = pg_temp.sid('P2'))
  || '/' || pg_temp.run('d0000000-0000-4000-8000-000000000ad1', $q$select (public.admin_community_stats() ->> 'sessions_disputed_open')$q$),
  'disputed/true/0');

-- the student reports a session that didn't happen
insert into t_ids (name, id)
select 'P3', pg_temp.run('d0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_plan_session('d0000000-0000-4000-8000-0000000005e1', 'd0000000-0000-4000-8000-0000000000a1', 'Texting', '', '', null, now() + interval '3 days', 30)::text$q$)::uuid;
select pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.student_session_action(%L, 'accept')::text$q$, pg_temp.sid('P3')));
select pg_temp.err('V "didn''t happen" waits until the start time',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.student_report_not_held(%L)::text$q$, pg_temp.sid('P3'))),
  'after a scheduled session');
update public.community_sessions set scheduled_at = now() - interval '9 hours' where id = pg_temp.sid('P3');
select pg_temp.ok('V Sky reports it didn''t happen',
  pg_temp.run('d0000000-0000-4000-8000-0000000005e1', format($q$select public.student_report_not_held(%L, 'Lou wasn''t feeling well')::text$q$, pg_temp.sid('P3'))));
select pg_temp.eq('V ...it''s canceled, with no time credited',
  (select status || '/' || coalesce(actual_minutes::text, 'none') from public.community_sessions where id = pg_temp.sid('P3')),
  'canceled/none');

select n, pass, label, detail from t_results where not pass
union all
select null, bool_and(pass), count(*) filter (where pass) || ' of ' || count(*) || ' checks passed', null from t_results
order by n nulls last;

rollback;
