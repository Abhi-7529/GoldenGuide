-- Admin support for GoldenGuide: an admins allow-list, admin-managed lessons
-- and practice scenarios, lightweight usage events, and security-definer RPCs
-- that let admins read platform-wide data. Admin access is never granted
-- through signup: the admins table has RLS enabled with no policies, so it can
-- only be changed by a database owner (or by an existing admin through
-- admin_set_admin).

-- ---------------------------------------------------------------------------
-- admins
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  topic text not null default 'General',
  summary text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lessons enable row level security;

create index if not exists lessons_status_sort_idx on public.lessons (status, sort_order);

drop trigger if exists lessons_set_updated_at on public.lessons;
create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

create policy "lessons_select_published_or_admin" on public.lessons
  for select to authenticated
  using (status = 'published' or public.is_admin());

create policy "lessons_insert_admin" on public.lessons
  for insert to authenticated
  with check (public.is_admin());

create policy "lessons_update_admin" on public.lessons
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "lessons_delete_admin" on public.lessons
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- practice scenarios
-- ---------------------------------------------------------------------------
create table if not exists public.practice_scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  prompt text not null check (length(trim(prompt)) > 0),
  choices jsonb not null default '[]'::jsonb check (jsonb_typeof(choices) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.practice_scenarios enable row level security;

create index if not exists practice_scenarios_status_sort_idx on public.practice_scenarios (status, sort_order);

drop trigger if exists practice_scenarios_set_updated_at on public.practice_scenarios;
create trigger practice_scenarios_set_updated_at
  before update on public.practice_scenarios
  for each row execute function public.set_updated_at();

create policy "practice_scenarios_select_published_or_admin" on public.practice_scenarios
  for select to authenticated
  using (status = 'published' or public.is_admin());

create policy "practice_scenarios_insert_admin" on public.practice_scenarios
  for insert to authenticated
  with check (public.is_admin());

create policy "practice_scenarios_update_admin" on public.practice_scenarios
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "practice_scenarios_delete_admin" on public.practice_scenarios
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- usage events (written by learners, read only through admin_usage())
-- ---------------------------------------------------------------------------
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('lesson_view', 'scenario_attempt')),
  ref_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.usage_events enable row level security;

create index if not exists usage_events_kind_created_idx on public.usage_events (kind, created_at);
create index if not exists usage_events_ref_idx on public.usage_events (ref_id);
create index if not exists usage_events_user_idx on public.usage_events (user_id);

create policy "usage_events_insert_own" on public.usage_events
  for insert to authenticated
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- admin RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'learners', (select count(*) from public.profiles where role = 'care_recipient'),
    'caregivers', (select count(*) from public.profiles where role = 'caregiver'),
    'incomplete_signups', (
      select count(*) from auth.users u
      where not exists (select 1 from public.profiles p where p.id = u.id)
    ),
    'linked_accounts', (select count(*) from public.connections),
    'admins', (select count(*) from public.admins),
    'published_lessons', (select count(*) from public.lessons where status = 'published'),
    'draft_lessons', (select count(*) from public.lessons where status = 'draft'),
    'published_scenarios', (select count(*) from public.practice_scenarios where status = 'published'),
    'draft_scenarios', (select count(*) from public.practice_scenarios where status = 'draft')
  );
end;
$$;

create or replace function public.admin_usage()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return jsonb_build_object(
    'active_7d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
    'active_30d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '30 days'),
    'signups_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'signups_30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'messages_total', (select count(*) from public.messages),
    'messages_7d', (select count(*) from public.messages where created_at >= now() - interval '7 days'),
    'lesson_views_total', (select count(*) from public.usage_events where kind = 'lesson_view'),
    'lesson_views_7d', (select count(*) from public.usage_events where kind = 'lesson_view' and created_at >= now() - interval '7 days'),
    'scenario_attempts_total', (select count(*) from public.usage_events where kind = 'scenario_attempt'),
    'scenario_attempts_7d', (select count(*) from public.usage_events where kind = 'scenario_attempt' and created_at >= now() - interval '7 days'),
    'signups_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', s.d, 'count', s.c) order by s.d), '[]'::jsonb)
      from (
        select g::date as d,
               (select count(*) from auth.users u where u.created_at::date = g::date) as c
        from generate_series(current_date - 13, current_date, interval '1 day') g
      ) s
    ),
    'top_lessons', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select l.title, count(*) as views
        from public.usage_events e
        join public.lessons l on l.id = e.ref_id
        where e.kind = 'lesson_view'
        group by l.id, l.title
        order by views desc
        limit 5
      ) t
    ),
    'top_scenarios', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select s.title, count(*) as attempts
        from public.usage_events e
        join public.practice_scenarios s on s.id = e.ref_id
        where e.kind = 'scenario_attempt'
        group by s.id, s.title
        order by attempts desc
        limit 5
      ) t
    )
  );
end;
$$;

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  linked_count bigint,
  is_admin_user boolean
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.full_name,
    p.role,
    u.created_at,
    u.last_sign_in_at,
    (select count(*) from public.connections c where c.caregiver_id = u.id or c.care_recipient_id = u.id),
    exists (select 1 from public.admins a where a.user_id = u.id)
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
end;
$$;

create or replace function public.admin_update_user_name(p_user_id uuid, p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.profiles set full_name = trim(p_full_name) where id = p_user_id;

  if not found then
    raise exception 'This user has not finished setting up their profile';
  end if;
end;
$$;

create or replace function public.admin_set_admin(p_user_id uuid, p_make_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if p_make_admin then
    insert into public.admins (user_id) values (p_user_id) on conflict do nothing;
  else
    if p_user_id = auth.uid() then
      raise exception 'You cannot remove your own admin access';
    end if;
    delete from public.admins where user_id = p_user_id;
  end if;
end;
$$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own account';
  end if;

  if exists (select 1 from public.admins where user_id = p_user_id) then
    raise exception 'Remove admin access before deleting this user';
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_usage() from public, anon;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_update_user_name(uuid, text) from public, anon;
revoke all on function public.admin_set_admin(uuid, boolean) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;

grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_usage() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_update_user_name(uuid, text) to authenticated;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- starter content: lesson drafts for each topic, plus the existing practice
-- scenario so learners keep what they had.
-- ---------------------------------------------------------------------------
insert into public.lessons (title, topic, summary, status, sort_order) values
  ('Budgeting basics', 'Budgeting', 'Plan where your money goes each month.', 'draft', 10),
  ('Understanding your bills', 'Bills', 'Read statements, track due dates, and catch errors.', 'draft', 20),
  ('Spotting scams', 'Scams', 'Learn the warning signs of common financial scams.', 'draft', 30),
  ('Building savings', 'Savings', 'Build an emergency fund and save toward goals.', 'draft', 40),
  ('How loans and interest work', 'Loans & Interest', 'Understand interest and what a loan really costs.', 'draft', 50),
  ('Investing fundamentals', 'Basic Investing', 'Get comfortable with the basics of investing.', 'draft', 60);

insert into public.practice_scenarios (title, prompt, choices, status, sort_order) values (
  'Unexpected car repair',
  'You have $2,500 available this month. Your car needs a $900 repair. What would you do?',
  $json$[
    {"label": "Pay for the repair using savings", "outcome": "Your repair is handled right away and you avoid interest charges — but your emergency savings drops, which could matter if another expense comes up soon."},
    {"label": "Put it on a credit card", "outcome": "Your savings stay intact, but if the balance isn't paid off quickly, interest charges can make the repair cost more over time."},
    {"label": "Wait and skip the repair for now", "outcome": "You save money today, but delaying car repairs can sometimes lead to bigger, more expensive problems later."},
    {"label": "Ask a family member for help", "outcome": "This can ease the immediate cost, but it helps to talk openly about whether and how you'd pay them back."}
  ]$json$::jsonb,
  'published',
  10
);
