-- Launch hardening, plus a contact inbox for organizations and general
-- questions.
--
-- 1. Caregiver links are only made with an invite code. Learners could
--    previously insert a connection row directly with any caregiver's id,
--    skipping the code. The app only ever uses redeem_invite_code(), which
--    runs as definer, so dropping the direct insert policy changes nothing
--    for real users.
-- 2. Only learners can redeem an invite code, so a caregiver can't link
--    themselves to another caregiver as if they were a learner.
-- 3. Chat messages have a sensible length limit (checked for new messages
--    only, so existing rows are left alone).
-- 4. contact_inquiries: anyone (signed in or not) can send a message from the
--    Contact or Organizations page. Only platform admins can read, update or
--    delete them. A trigger fixes server-owned fields and limits how many
--    messages one email address can send per day, to slow down spam.

-- ---------------------------------------------------------------------------
-- 1. connections: no direct inserts
-- ---------------------------------------------------------------------------
drop policy if exists "connections_insert_care_recipient" on public.connections;

-- ---------------------------------------------------------------------------
-- 2. redeem_invite_code: learners only, forgiving about spaces and case
-- ---------------------------------------------------------------------------
create or replace function public.redeem_invite_code(p_code text)
returns public.connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caregiver_id uuid;
  v_connection public.connections;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'care_recipient'
  ) then
    raise exception 'Only learners can use an invite code.';
  end if;

  select id into v_caregiver_id
  from public.profiles
  where invite_code = upper(trim(p_code)) and role = 'caregiver';

  if v_caregiver_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.connections (caregiver_id, care_recipient_id)
  values (v_caregiver_id, auth.uid())
  on conflict (caregiver_id, care_recipient_id) do nothing
  returning * into v_connection;

  if v_connection.id is null then
    select * into v_connection from public.connections
    where caregiver_id = v_caregiver_id and care_recipient_id = auth.uid();
  end if;

  return v_connection;
end;
$$;

revoke all on function public.redeem_invite_code(text) from public, anon;
grant execute on function public.redeem_invite_code(text) to authenticated;

revoke all on function public.get_my_connections() from public, anon;
grant execute on function public.get_my_connections() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. messages: length limit for new messages
-- ---------------------------------------------------------------------------
alter table public.messages drop constraint if exists messages_body_length;
alter table public.messages add constraint messages_body_length
  check (length(trim(body)) between 1 and 2000) not valid;

-- ---------------------------------------------------------------------------
-- 4. contact inquiries
-- ---------------------------------------------------------------------------
create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'general' check (kind in ('organization', 'general')),
  name text not null check (length(trim(name)) between 1 and 100),
  email text not null check (
    length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  organization text not null default '' check (length(organization) <= 150),
  organization_type text not null default '' check (length(organization_type) <= 60),
  message text not null check (length(trim(message)) between 10 and 4000),
  status text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now()
);

alter table public.contact_inquiries enable row level security;

create index if not exists contact_inquiries_status_created_idx
  on public.contact_inquiries (status, created_at desc);
create index if not exists contact_inquiries_email_created_idx
  on public.contact_inquiries (lower(email), created_at desc);

create or replace function public.prepare_contact_inquiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_at := now();
  new.status := 'new';
  new.email := lower(trim(new.email));
  new.name := trim(new.name);

  if (
    select count(*) from public.contact_inquiries c
    where lower(c.email) = new.email
      and c.created_at > now() - interval '1 day'
  ) >= 3 then
    raise exception 'We already have your messages from today. We''ll be in touch soon.';
  end if;
  return new;
end;
$$;

revoke all on function public.prepare_contact_inquiry() from public, anon, authenticated;

drop trigger if exists contact_inquiries_prepare on public.contact_inquiries;
create trigger contact_inquiries_prepare
  before insert on public.contact_inquiries
  for each row execute function public.prepare_contact_inquiry();

drop policy if exists "contact_inquiries_insert_anon" on public.contact_inquiries;
create policy "contact_inquiries_insert_anon" on public.contact_inquiries
  for insert to anon
  with check (status = 'new');

drop policy if exists "contact_inquiries_insert_authenticated" on public.contact_inquiries;
create policy "contact_inquiries_insert_authenticated" on public.contact_inquiries
  for insert to authenticated
  with check (status = 'new');

drop policy if exists "contact_inquiries_select_admin" on public.contact_inquiries;
create policy "contact_inquiries_select_admin" on public.contact_inquiries
  for select to authenticated
  using (public.is_admin());

drop policy if exists "contact_inquiries_update_admin" on public.contact_inquiries;
create policy "contact_inquiries_update_admin" on public.contact_inquiries
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "contact_inquiries_delete_admin" on public.contact_inquiries;
create policy "contact_inquiries_delete_admin" on public.contact_inquiries
  for delete to authenticated
  using (public.is_admin());
