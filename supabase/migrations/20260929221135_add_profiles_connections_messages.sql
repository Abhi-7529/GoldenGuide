-- Adds caregiver/care-recipient profiles, caregiver<->recipient connections
-- (via a randomly generated invite code), and in-app messaging between
-- connected pairs.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('caregiver', 'care_recipient')),
  full_name text not null default '',
  invite_code text unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- Caregivers get a random invite code on creation; care recipients use it
-- (via redeem_invite_code below) to form a connection.
create or replace function public.set_invite_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if new.role = 'caregiver' and new.invite_code is null then
    loop
      v_code := upper(substr(md5(random()::text), 1, 6));
      exit when not exists (select 1 from public.profiles where invite_code = v_code);
    end loop;
    new.invite_code := v_code;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_invite_code on public.profiles;
create trigger profiles_set_invite_code
  before insert on public.profiles
  for each row execute function public.set_invite_code();

-- ---------------------------------------------------------------------------
-- connections
-- ---------------------------------------------------------------------------
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  care_recipient_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (caregiver_id, care_recipient_id)
);

alter table public.connections enable row level security;

create index if not exists connections_caregiver_id_idx on public.connections (caregiver_id);
create index if not exists connections_care_recipient_id_idx on public.connections (care_recipient_id);

create policy "connections_select_participant" on public.connections
  for select to authenticated
  using (caregiver_id = auth.uid() or care_recipient_id = auth.uid());

create policy "connections_insert_care_recipient" on public.connections
  for insert to authenticated
  with check (care_recipient_id = auth.uid());

create policy "connections_delete_participant" on public.connections
  for delete to authenticated
  using (caregiver_id = auth.uid() or care_recipient_id = auth.uid());

-- Looks up a caregiver by invite code and creates a connection to the
-- calling (care recipient) user. Runs as definer so a care recipient can
-- resolve a caregiver's id from their code without a broad profiles SELECT
-- policy exposing every profile.
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
  select id into v_caregiver_id
  from public.profiles
  where invite_code = p_code and role = 'caregiver';

  if v_caregiver_id is null then
    raise exception 'Invalid invite code';
  end if;

  if v_caregiver_id = auth.uid() then
    raise exception 'You cannot connect to yourself';
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

grant execute on function public.redeem_invite_code(text) to authenticated;

-- Returns the calling user's connections joined with the partner's profile,
-- without needing a broad profiles SELECT policy.
create or replace function public.get_my_connections()
returns table (
  connection_id uuid,
  partner_id uuid,
  partner_full_name text,
  partner_role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id,
    case when c.caregiver_id = auth.uid() then c.care_recipient_id else c.caregiver_id end,
    p.full_name,
    p.role,
    c.created_at
  from public.connections c
  join public.profiles p
    on p.id = case when c.caregiver_id = auth.uid() then c.care_recipient_id else c.caregiver_id end
  where c.caregiver_id = auth.uid() or c.care_recipient_id = auth.uid();
$$;

grant execute on function public.get_my_connections() to authenticated;

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create index if not exists messages_connection_id_idx on public.messages (connection_id);

create policy "messages_select_participant" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.connections c
      where c.id = messages.connection_id
        and (c.caregiver_id = auth.uid() or c.care_recipient_id = auth.uid())
    )
  );

create policy "messages_insert_participant" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.connections c
      where c.id = messages.connection_id
        and (c.caregiver_id = auth.uid() or c.care_recipient_id = auth.uid())
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end;
$$;
