-- Permission tests for the Community Skill Exchange
-- (migration 20261021030818_community_skill_exchange).
--
-- Runs inside one transaction that is rolled back at the end, so it leaves
-- no data behind. It makes throwaway users and acts as each of them through
-- request.jwt.claims + the authenticated role, exactly like PostgREST does,
-- so every check goes through the same RLS policies and RPCs as the app.
--
--   npx supabase db query --linked -f supabase/tests/community_exchange.sql
--
-- Prints one row per check (label, pass, detail); every pass should be true.
-- To test before the migration is pushed, run the migration inside the same
-- transaction: put its contents right after "begin;" (see the
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
-- c...a  caregiver Alice (Family plan, learners Lou and Lena)
-- c...b  caregiver Bob (Free plan, learner Lee)
-- 5e1..5e4  people who will try to become students; 9e1, 9e2 regular sign-ups
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
select v.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'cse-test-' || right(v.id, 3) || '@example.invalid', now(), now()
from (values
  ('c0000000-0000-4000-8000-00000000000a'),
  ('c0000000-0000-4000-8000-00000000000b'),
  ('c0000000-0000-4000-8000-0000000000a1'),
  ('c0000000-0000-4000-8000-0000000000a2'),
  ('c0000000-0000-4000-8000-0000000000b1'),
  ('c0000000-0000-4000-8000-0000000005e1'),
  ('c0000000-0000-4000-8000-0000000005e2'),
  ('c0000000-0000-4000-8000-0000000005e3'),
  ('c0000000-0000-4000-8000-0000000005e4'),
  ('c0000000-0000-4000-8000-0000000009e1'),
  ('c0000000-0000-4000-8000-0000000009e2')
) v (id);

insert into public.profiles (id, role, full_name) values
  ('c0000000-0000-4000-8000-00000000000a', 'caregiver', 'Alice Adams'),
  ('c0000000-0000-4000-8000-00000000000b', 'caregiver', 'Bob Brown'),
  ('c0000000-0000-4000-8000-0000000000a1', 'care_recipient', 'Lou Adams'),
  ('c0000000-0000-4000-8000-0000000000a2', 'care_recipient', 'Lena Adams'),
  ('c0000000-0000-4000-8000-0000000000b1', 'care_recipient', 'Lee Brown');

insert into public.memberships (caregiver_id, status, current_period_end)
values ('c0000000-0000-4000-8000-00000000000a', 'active', now() + interval '30 days');

insert into public.connections (caregiver_id, care_recipient_id) values
  ('c0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-0000000000a1'),
  ('c0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-0000000000a2'),
  ('c0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-0000000000b1');

-- ---------------------------------------------------------------------------
-- 1. caregivers make codes
-- ---------------------------------------------------------------------------
insert into t_ids (name, id, code)
select n, split_part(r, '|', 1)::uuid, split_part(r, '|', 2)
from (
  select n, pg_temp.run(
    case when n like 'B%' then 'c0000000-0000-4000-8000-00000000000b' else 'c0000000-0000-4000-8000-00000000000a' end::uuid,
    format($q$select id::text || '|' || code from public.create_student_invitation(%L)$q$, n)
  ) r
  from unnest(array['A1', 'A2', 'A3', 'A4', 'B1']) n
) x;

select pg_temp.check(
  '1 caregiver codes look like XXXXX-XXXXX from the safe alphabet',
  (select bool_and(code ~ '^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$') from t_ids) and (select count(*) = 5 from t_ids),
  (select string_agg(name || '=' || coalesce(code, 'null'), ', ') from t_ids)
);
select pg_temp.check(
  '1 only the hash of a code is stored',
  not exists (
    select 1 from public.community_invitations i, t_ids t
    where position(convert_to(replace(t.code, '-', ''), 'UTF8') in i.code_hash) > 0
  )
);
select pg_temp.err('1 a learner can''t make a student code',
  pg_temp.run('c0000000-0000-4000-8000-0000000000a1', $q$select code from public.create_student_invitation('x')$q$),
  'Only caregivers');
select pg_temp.eq('1 Bob can''t see Alice''s invitations',
  pg_temp.run('c0000000-0000-4000-8000-00000000000b', $q$select count(*)::text from public.community_invitations where caregiver_id = 'c0000000-0000-4000-8000-00000000000a'$q$),
  '0');

-- ---------------------------------------------------------------------------
-- 2. no code, no student account
-- ---------------------------------------------------------------------------
select pg_temp.err('2 signing up as a student directly is refused',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e3', $q$insert into public.profiles (id, role, full_name) values ('c0000000-0000-4000-8000-0000000005e3', 'student', 'Sneaky') returning id::text$q$),
  'row-level security');
select pg_temp.err('2 joining a community directly is refused',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e3', $q$insert into public.community_members (caregiver_id, student_id) values ('c0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-0000000005e3') returning id::text$q$),
  'row-level security');
select pg_temp.err('2 signed-out visitors can''t call the redeem RPC',
  pg_temp.run(null, $q$select public.redeem_student_invitation('AAAAA-AAAAA', 'X', true, true, null)::text$q$),
  'permission denied');
select pg_temp.eq('2 a made-up code is refused',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e3', $q$select (public.redeem_student_invitation('ZZZZZ-ZZZZZ', 'Sam', true, true, 'America/Chicago') ->> 'ok')$q$),
  'false');
select pg_temp.eq('2 ...and no profile was created',
  (select count(*)::text from public.profiles where id = 'c0000000-0000-4000-8000-0000000005e3'), '0');

-- ---------------------------------------------------------------------------
-- 3. expired, revoked and used codes
-- ---------------------------------------------------------------------------
update public.community_invitations set expires_at = now() - interval '1 minute' where id = pg_temp.sid('A3');
select pg_temp.eq('3 an expired code is refused',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e3', format($q$select (public.redeem_student_invitation(%L, 'Sam', true, true, null) ->> 'ok')$q$, (select code from t_ids where name = 'A3'))),
  'false');

select pg_temp.err('3 Bob can''t cancel Alice''s code',
  pg_temp.run('c0000000-0000-4000-8000-00000000000b', format($q$select public.revoke_student_invitation(%L)::text$q$, pg_temp.sid('A4'))),
  'can''t be canceled');
select pg_temp.ok('3 Alice cancels her code',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', format($q$select public.revoke_student_invitation(%L)::text$q$, pg_temp.sid('A4'))));
select pg_temp.eq('3 a canceled code is refused',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e3', format($q$select (public.redeem_student_invitation(%L, 'Sam', true, true, null) ->> 'ok')$q$, (select code from t_ids where name = 'A4'))),
  'false');

select pg_temp.eq('3 both consent boxes are required',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e3', format($q$select (public.redeem_student_invitation(%L, 'Sam', false, true, null) ->> 'error')$q$, (select code from t_ids where name = 'A2'))),
  'Please confirm both boxes to continue.');

-- ---------------------------------------------------------------------------
-- 4. a valid code links the student to the right community
-- ---------------------------------------------------------------------------
select pg_temp.eq('4 Sky redeems Alice''s code (lower case, spaces)',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.redeem_student_invitation(%L, 'Sky Student', true, true, 'America/Chicago')::text$q$,
    ' ' || lower(replace((select code from t_ids where name = 'A1'), '-', ' ')) || ' ')),
  '{"ok": true, "caregiver_name": "Alice"}');
select pg_temp.eq('4 Sky is now a student',
  (select role from public.profiles where id = 'c0000000-0000-4000-8000-0000000005e1'), 'student');
select pg_temp.eq('4 Sky is an active member of Alice''s community only',
  (select string_agg(caregiver_id::text || ':' || status, ',') from public.community_members where student_id = 'c0000000-0000-4000-8000-0000000005e1'),
  'c0000000-0000-4000-8000-00000000000a:active');
select pg_temp.check('4 the code is used up by Sky',
  (select consumed_by = 'c0000000-0000-4000-8000-0000000005e1' and consumed_at is not null from public.community_invitations where id = pg_temp.sid('A1')));
select pg_temp.eq('3 a used code is refused',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e2', format($q$select (public.redeem_student_invitation(%L, 'Sid', true, true, null) ->> 'ok')$q$, (select code from t_ids where name = 'A1'))),
  'false');
select pg_temp.eq('4 Sid redeems Bob''s code',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e2', format($q$select (public.redeem_student_invitation(%L, 'Sid Student', true, true, null) ->> 'ok')$q$, (select code from t_ids where name = 'B1'))),
  'true');

select pg_temp.eq('4 a learner can''t turn into a student',
  pg_temp.run('c0000000-0000-4000-8000-0000000000a1', format($q$select (public.redeem_student_invitation(%L) ->> 'ok')$q$, (select code from t_ids where name = 'A2'))),
  'false');
select pg_temp.eq('4 a caregiver can''t turn into a student',
  pg_temp.run('c0000000-0000-4000-8000-00000000000b', format($q$select (public.redeem_student_invitation(%L) ->> 'ok')$q$, (select code from t_ids where name = 'A2'))),
  'false');
select pg_temp.eq('4 a current member can''t use another code from the same family',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select (public.redeem_student_invitation(%L) ->> 'error')$q$, (select code from t_ids where name = 'A2'))),
  'You''re already part of this family''s community.');
select pg_temp.check('4 ...and none of those used up code A2',
  (select consumed_at is null from public.community_invitations where id = pg_temp.sid('A2')));

-- rate limiting: 5 wrong codes in an hour, then even a good code waits
select pg_temp.run('c0000000-0000-4000-8000-0000000005e4', format($q$select public.redeem_student_invitation(%L, 'Max', true, true, null)::text$q$, 'WRONG-COD' || g))
from generate_series(1, 5) g;
select pg_temp.check('4 after 5 wrong codes, a good code is held back',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e4', format($q$select (public.redeem_student_invitation(%L, 'Max', true, true, null) ->> 'error')$q$, (select code from t_ids where name = 'A2'))) like 'Too many tries%');
select pg_temp.check('4 ...and code A2 is still unused',
  (select consumed_at is null from public.community_invitations where id = pg_temp.sid('A2')));
select pg_temp.eq('4 nobody can read the attempt log',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e4', $q$select count(*)::text from public.invitation_attempts$q$), '0');

-- ---------------------------------------------------------------------------
-- 5. students only see their own communities
-- ---------------------------------------------------------------------------
select pg_temp.eq('5 a student can''t read invitations',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select count(*)::text from public.community_invitations$q$), '0');
select pg_temp.eq('5 a student sees only their own memberships',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select count(*)::text from public.community_members$q$), '1');
select pg_temp.eq('5 a student can''t read caregiver or learner profiles',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select count(*)::text from public.profiles$q$), '1');
select pg_temp.eq('5 Sky''s community list shows Alice with no learners yet',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select jsonb_path_query_array(public.my_student_communities(), '$[*].caregiver_name')::text || jsonb_path_query_array(public.my_student_communities(), '$[*].learners')::text$q$),
  '["Alice"][[]]');
select pg_temp.eq('5 Bob can''t see Sky''s profile',
  pg_temp.run('c0000000-0000-4000-8000-00000000000b', $q$select count(*)::text from public.student_profiles where id = 'c0000000-0000-4000-8000-0000000005e1'$q$), '0');
select pg_temp.eq('5 Alice can see Sky''s profile',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select display_name from public.student_profiles where id = 'c0000000-0000-4000-8000-0000000005e1'$q$), 'Sky Student');

select pg_temp.ok('5 Sky adds a skill',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$insert into public.student_skills (student_id, category, title) values ('c0000000-0000-4000-8000-0000000005e1', 'technology', 'Video calls') returning id::text$q$));
select pg_temp.err('5 Sky can''t add a skill to Sid''s profile',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$insert into public.student_skills (student_id, category, title) values ('c0000000-0000-4000-8000-0000000005e2', 'art', 'Fake') returning id::text$q$),
  'row-level security');
select pg_temp.eq('5 Alice sees Sky''s skill; Bob doesn''t',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select count(*)::text from public.student_skills$q$)
  || pg_temp.run('c0000000-0000-4000-8000-00000000000b', $q$select count(*)::text from public.student_skills$q$),
  '10');
select pg_temp.eq('5 Sky can''t change her consent dates directly',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$with u as (update public.student_profiles set age_confirmed_at = now() returning 1) select count(*)::text from u$q$),
  '0');

-- ---------------------------------------------------------------------------
-- 6/7. learner access and session approval
-- ---------------------------------------------------------------------------
select pg_temp.err('7 Sky can''t ask for a session before Alice approves a learner',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select public.student_request_session('c0000000-0000-4000-8000-0000000000a1', 'Email', '', 'remote', now() + interval '2 days', 30)::text$q$),
  'approved');
select pg_temp.err('5 Sky can''t ask for a session with Bob''s learner',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select public.student_request_session('c0000000-0000-4000-8000-0000000000b1', 'Email', '', 'remote', now() + interval '2 days', 30)::text$q$),
  'approved');
select pg_temp.err('5 Bob can''t approve learners for a student outside his community',
  pg_temp.run('c0000000-0000-4000-8000-00000000000b', $q$select public.set_student_learner_access('c0000000-0000-4000-8000-0000000005e1', 'c0000000-0000-4000-8000-0000000000b1', true)::text$q$),
  'isn''t in your community');
select pg_temp.err('5 Alice can''t approve Bob''s learner',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select public.set_student_learner_access('c0000000-0000-4000-8000-0000000005e1', 'c0000000-0000-4000-8000-0000000000b1', true)::text$q$),
  'isn''t connected');
select pg_temp.ok('7 Alice lets Sky work with Lou',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select public.set_student_learner_access('c0000000-0000-4000-8000-0000000005e1', 'c0000000-0000-4000-8000-0000000000a1', true)::text$q$));
select pg_temp.eq('7 Sky now sees Lou (first name only), not Lena',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select (public.my_student_communities() -> 0 -> 'learners')::text$q$),
  '[{"id": "c0000000-0000-4000-8000-0000000000a1", "name": "Lou"}]');
select pg_temp.err('7 Sky still can''t ask for a session with Lena',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select public.student_request_session('c0000000-0000-4000-8000-0000000000a2', 'Email', '', 'remote', now() + interval '2 days', 30)::text$q$),
  'approved');
select pg_temp.err('7 sessions longer than 30 minutes can''t be planned yet',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select public.student_request_session('c0000000-0000-4000-8000-0000000000a1', 'Email', '', 'remote', now() + interval '2 days', 45)::text$q$),
  'up to 30 minutes');
select pg_temp.err('7 sessions can''t be planned in the past',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select public.student_request_session('c0000000-0000-4000-8000-0000000000a1', 'Email', '', 'remote', now() - interval '1 hour', 30)::text$q$),
  'future');

insert into t_ids (name, id)
select 'S1', pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select public.student_request_session('c0000000-0000-4000-8000-0000000000a1', 'Using email', 'Sending photos', 'remote', now() + interval '2 days', 30)::text$q$)::uuid;
select pg_temp.eq('7 Sky''s request waits for Alice',
  (select status from public.community_sessions where id = pg_temp.sid('S1')), 'pending_approval');
select pg_temp.err('7 Bob can''t approve Alice''s session',
  pg_temp.run('c0000000-0000-4000-8000-00000000000b', format($q$select public.caregiver_session_action(%L, 'approve')::text$q$, pg_temp.sid('S1'))),
  'not found');
select pg_temp.err('7 Sky can''t approve her own request',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.caregiver_session_action(%L, 'approve')::text$q$, pg_temp.sid('S1'))),
  'not found');
select pg_temp.eq('7 Sky can''t change the status directly',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$with u as (update public.community_sessions set status = 'scheduled' where id = %L returning 1) select count(*)::text from u$q$, pg_temp.sid('S1'))),
  '0');
select pg_temp.err('7 Sky can''t insert a session directly',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$insert into public.community_sessions (caregiver_id, student_id, learner_id, caregiver_name, student_name, learner_name, topic, format, scheduled_at, planned_minutes, status, requested_by, actual_minutes) values ('c0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-0000000005e1', 'c0000000-0000-4000-8000-0000000000a1', 'A', 'S', 'L', 'Fake', 'remote', now() - interval '1 day', 30, 'verified', 'student', 600) returning id::text$q$),
  'row-level security');
select pg_temp.ok('7 Alice approves',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', format($q$select public.caregiver_session_action(%L, 'approve')::text$q$, pg_temp.sid('S1'))));
select pg_temp.eq('7 ...and it is scheduled',
  (select status from public.community_sessions where id = pg_temp.sid('S1')), 'scheduled');

select pg_temp.err('7 in-person sessions need a supervising adult',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_create_session('c0000000-0000-4000-8000-0000000005e1', 'c0000000-0000-4000-8000-0000000000a2', 'Baking', '', 'supervised_in_person', '', now() + interval '3 days', 30, false)::text$q$),
  'trusted adult');
select pg_temp.err('7 Alice can''t plan a session with Bob''s student',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_create_session('c0000000-0000-4000-8000-0000000005e2', 'c0000000-0000-4000-8000-0000000000a1', 'Baking', '', 'remote', '', now() + interval '3 days', 30)::text$q$),
  'isn''t in your community');
insert into t_ids (name, id)
select 'S2', pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_create_session('c0000000-0000-4000-8000-0000000005e1', 'c0000000-0000-4000-8000-0000000000a2', 'Baking bread', '', 'supervised_in_person', 'At the community center', now() + interval '3 days', 30, true)::text$q$)::uuid;
select pg_temp.eq('7 Alice''s session waits for Sky',
  (select status from public.community_sessions where id = pg_temp.sid('S2')), 'invited');
select pg_temp.ok('7 Sky accepts',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.student_session_action(%L, 'accept')::text$q$, pg_temp.sid('S2'))));
select pg_temp.ok('7 Alice moves it to another day',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', format($q$select public.caregiver_update_session(%L, now() + interval '4 days', 30, 'At the library')::text$q$, pg_temp.sid('S2'))));
select pg_temp.eq('7 ...which goes back to Sky to confirm',
  (select status from public.community_sessions where id = pg_temp.sid('S2')), 'invited');

-- ---------------------------------------------------------------------------
-- 8/9. logging and verifying hours
-- ---------------------------------------------------------------------------
select pg_temp.err('8 time can''t be logged before the session starts',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.student_submit_hours(%L, 30, 'Taught email')::text$q$, pg_temp.sid('S1'))),
  'once the session has started');
update public.community_sessions set scheduled_at = now() - interval '1 hour' where id = pg_temp.sid('S1');
select pg_temp.ok('8 Sky logs 45 minutes for a 30-minute session',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.student_submit_hours(%L, 45, 'Showed Lou how to attach photos')::text$q$, pg_temp.sid('S1'))));
select pg_temp.err('8 Sky can''t verify her own hours',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.caregiver_session_action(%L, 'verify')::text$q$, pg_temp.sid('S1'))),
  'not found');
select pg_temp.eq('8 Sky can''t mark it verified directly',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$with u as (update public.community_sessions set status = 'verified' where id = %L returning 1) select count(*)::text from u$q$, pg_temp.sid('S1'))),
  '0');
select pg_temp.err('8 Bob can''t verify Alice''s session',
  pg_temp.run('c0000000-0000-4000-8000-00000000000b', format($q$select public.caregiver_session_action(%L, 'verify')::text$q$, pg_temp.sid('S1'))),
  'not found');
select pg_temp.ok('8 Alice verifies',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', format($q$select public.caregiver_session_action(%L, 'verify')::text$q$, pg_temp.sid('S1'))));
select pg_temp.eq('8 the record keeps the real time and the verifier''s name',
  (select status || '/' || actual_minutes || '/' || verified_by_name from public.community_sessions where id = pg_temp.sid('S1')),
  'verified/45/Alice Adams');

-- a second session that needs a correction first
insert into t_ids (name, id)
select 'S3', pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_create_session('c0000000-0000-4000-8000-0000000005e1', 'c0000000-0000-4000-8000-0000000000a1', 'Spotting scam texts', '', 'remote', 'FaceTime on Lou''s iPad', now() + interval '1 day', 30)::text$q$)::uuid;
select pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.student_session_action(%L, 'accept')::text$q$, pg_temp.sid('S3')));
update public.community_sessions set scheduled_at = now() - interval '2 hours' where id = pg_temp.sid('S3');
select pg_temp.ok('8 Sky logs 20 minutes',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.student_submit_hours(%L, 20, 'Went through 5 example texts')::text$q$, pg_temp.sid('S3'))));
select pg_temp.err('8 asking for a correction needs a reason',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', format($q$select public.caregiver_session_action(%L, 'request_correction', '')::text$q$, pg_temp.sid('S3'))),
  'what needs fixing');
select pg_temp.ok('8 Alice asks for a correction',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', format($q$select public.caregiver_session_action(%L, 'request_correction', 'I think it was 25 minutes')::text$q$, pg_temp.sid('S3'))));
select pg_temp.ok('8 Sky fixes it',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.student_submit_hours(%L, 25, 'Went through 5 example texts')::text$q$, pg_temp.sid('S3'))));
select pg_temp.ok('8 Alice verifies the fix',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', format($q$select public.caregiver_session_action(%L, 'verify')::text$q$, pg_temp.sid('S3'))));
select pg_temp.eq('9 verified total is 45 + 25 = 70 minutes',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select coalesce(sum(actual_minutes), 0)::text from public.community_sessions where status = 'verified'$q$),
  '70');

select pg_temp.ok('8 Sky changes a verified record',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.student_submit_hours(%L, 50, 'Showed Lou how to attach photos')::text$q$, pg_temp.sid('S1'))));
select pg_temp.eq('8 ...which needs verifying again and leaves the total',
  (select status || '/' || (verified_at is null)::text from public.community_sessions where id = pg_temp.sid('S1'))
  || '/' || pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select coalesce(sum(actual_minutes), 0)::text from public.community_sessions where status = 'verified'$q$),
  'pending_verification/true/25');
select pg_temp.ok('8 Alice disputes the change',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', format($q$select public.caregiver_session_action(%L, 'dispute', 'It was 45 minutes')::text$q$, pg_temp.sid('S1'))));
select pg_temp.eq('8 the audit history records each step, by role',
  (select string_agg(actor_role || ':' || event, ',' order by created_at, event) from public.session_events where session_id = pg_temp.sid('S1')),
  'student:requested,caregiver:approve,student:submitted,caregiver:verify,student:resubmitted,caregiver:dispute');
select pg_temp.eq('8 Sky can read her session''s history; Bob and Lou can''t',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select count(*)::text from public.session_events where session_id = %L$q$, pg_temp.sid('S1')))
  || '/' || pg_temp.run('c0000000-0000-4000-8000-00000000000b', $q$select count(*)::text from public.session_events$q$)
  || '/' || pg_temp.run('c0000000-0000-4000-8000-0000000000a1', $q$select count(*)::text from public.session_events$q$),
  '6/0/0');

-- ---------------------------------------------------------------------------
-- learners
-- ---------------------------------------------------------------------------
select pg_temp.eq('Lou sees his own sessions; Lee sees none',
  pg_temp.run('c0000000-0000-4000-8000-0000000000a1', $q$select count(*)::text from public.community_sessions$q$)
  || '/' || pg_temp.run('c0000000-0000-4000-8000-0000000000b1', $q$select count(*)::text from public.community_sessions$q$),
  '2/0');
insert into t_ids (name, id)
select 'S4', pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_create_session('c0000000-0000-4000-8000-0000000005e1', 'c0000000-0000-4000-8000-0000000000a1', 'Online banking', '', 'remote', '', now() + interval '5 days', 30)::text$q$)::uuid;
select pg_temp.err('Lee can''t answer for Lou''s session',
  pg_temp.run('c0000000-0000-4000-8000-0000000000b1', format($q$select public.learner_session_response(%L, false)::text$q$, pg_temp.sid('S4'))),
  'not found');
select pg_temp.ok('Lou says "not this time"',
  pg_temp.run('c0000000-0000-4000-8000-0000000000a1', format($q$select public.learner_session_response(%L, false)::text$q$, pg_temp.sid('S4'))));
select pg_temp.eq('...which cancels it',
  (select status || '/' || learner_response from public.community_sessions where id = pg_temp.sid('S4')), 'canceled/no');
select pg_temp.eq('Sid can''t see any of Sky''s sessions',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e2', $q$select count(*)::text from public.community_sessions$q$), '0');

-- ---------------------------------------------------------------------------
-- 6. removing a student
-- ---------------------------------------------------------------------------
insert into t_ids (name, id)
select 'S5', pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_create_session('c0000000-0000-4000-8000-0000000005e1', 'c0000000-0000-4000-8000-0000000000a1', 'Texting', '', 'remote', '', now() + interval '6 days', 30)::text$q$)::uuid;
select pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.student_session_action(%L, 'accept')::text$q$, pg_temp.sid('S5')));
insert into t_ids (name, id)
select 'S6', pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_create_session('c0000000-0000-4000-8000-0000000005e1', 'c0000000-0000-4000-8000-0000000000a1', 'Maps', '', 'remote', '', now() + interval '1 day', 30)::text$q$)::uuid;
select pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.student_session_action(%L, 'accept')::text$q$, pg_temp.sid('S6')));
update public.community_sessions set scheduled_at = now() - interval '30 minutes' where id = pg_temp.sid('S6');

select pg_temp.err('6 Bob can''t remove Alice''s student',
  pg_temp.run('c0000000-0000-4000-8000-00000000000b', $q$select public.remove_community_student('c0000000-0000-4000-8000-0000000005e1')::text$q$),
  'isn''t in your community');
select pg_temp.ok('6 Alice removes Sky',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select public.remove_community_student('c0000000-0000-4000-8000-0000000005e1')::text$q$));
select pg_temp.eq('6 upcoming sessions are canceled; past ones stay',
  (select string_agg(t.name || ':' || s.status, ',' order by t.name) from t_ids t join public.community_sessions s on s.id = t.id where t.name in ('S2', 'S3', 'S5', 'S6')),
  'S2:canceled,S3:verified,S5:canceled,S6:scheduled');
select pg_temp.eq('6 Sky''s learner access is gone',
  (select count(*)::text from public.community_learner_access where student_id = 'c0000000-0000-4000-8000-0000000005e1'), '0');
select pg_temp.err('6 Sky can''t ask for new sessions',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select public.student_request_session('c0000000-0000-4000-8000-0000000000a1', 'Email', '', 'remote', now() + interval '2 days', 30)::text$q$),
  'approved');
select pg_temp.err('6 Alice can''t plan sessions with Sky',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select public.caregiver_create_session('c0000000-0000-4000-8000-0000000005e1', 'c0000000-0000-4000-8000-0000000000a1', 'Email', '', 'remote', '', now() + interval '2 days', 30)::text$q$),
  'isn''t in your community');
select pg_temp.eq('6 Sky still has her service history',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select count(*)::text from public.community_sessions where status = 'verified'$q$), '1');
select pg_temp.ok('6 Sky can still log time for a session that already happened',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.student_submit_hours(%L, 30, 'Used maps to find the pharmacy')::text$q$, pg_temp.sid('S6'))));
select pg_temp.ok('6 ...and Alice can still verify it',
  pg_temp.run('c0000000-0000-4000-8000-00000000000a', format($q$select public.caregiver_session_action(%L, 'verify')::text$q$, pg_temp.sid('S6'))));
select pg_temp.eq('6 Sky''s community list shows the removal',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', $q$select (public.my_student_communities() -> 0 ->> 'status') || (public.my_student_communities() -> 0 -> 'learners')::text$q$),
  'removed[]');

insert into t_ids (name, id, code)
select 'A5', split_part(r, '|', 1)::uuid, split_part(r, '|', 2)
from (select pg_temp.run('c0000000-0000-4000-8000-00000000000a', $q$select id::text || '|' || code from public.create_student_invitation('Sky again')$q$) r) x;
select pg_temp.eq('6 Alice can invite Sky back with a new code',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select (public.redeem_student_invitation(%L) ->> 'ok')$q$, (select code from t_ids where name = 'A5'))),
  'true');
select pg_temp.eq('6 ...which makes her an active member again',
  (select status from public.community_members where student_id = 'c0000000-0000-4000-8000-0000000005e1'), 'active');
select pg_temp.ok('6 Sid can leave Bob''s community',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e2', $q$select public.leave_community('c0000000-0000-4000-8000-00000000000b')::text$q$));

-- ---------------------------------------------------------------------------
-- 10. existing onboarding still works
-- ---------------------------------------------------------------------------
select pg_temp.ok('10 a new learner can still set up their profile',
  pg_temp.run('c0000000-0000-4000-8000-0000000009e1', $q$insert into public.profiles (id, role, full_name) values ('c0000000-0000-4000-8000-0000000009e1', 'care_recipient', 'New Learner') returning id::text$q$));
select pg_temp.check('10 a new caregiver can still set up their profile and gets a learner invite code',
  pg_temp.run('c0000000-0000-4000-8000-0000000009e2', $q$insert into public.profiles (id, role, full_name) values ('c0000000-0000-4000-8000-0000000009e2', 'caregiver', 'New Caregiver') returning coalesce(invite_code, 'none')$q$) ~ '^[0-9A-F]{6}$');
select pg_temp.err('10 a student can''t use a learner invite code',
  pg_temp.run('c0000000-0000-4000-8000-0000000005e1', format($q$select public.redeem_invite_code(%L)::text$q$, (select invite_code from public.profiles where id = 'c0000000-0000-4000-8000-00000000000b'))),
  'Only learners');
select pg_temp.eq('signed-out visitors see no community data',
  pg_temp.run(null, $q$select count(*)::text from public.community_sessions$q$), '0');

select n, pass, label, detail from t_results where not pass
union all
select null, bool_and(pass), count(*) filter (where pass) || ' of ' || count(*) || ' checks passed', null from t_results
order by n nulls last;

rollback;
