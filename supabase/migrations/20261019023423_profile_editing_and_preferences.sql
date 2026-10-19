-- Profile editing and saved accessibility preferences.
--
-- profiles still has no general UPDATE policy, so nobody can change their
-- own role or invite code. These two definer RPCs are the only ways a person
-- can change their own profile, and each touches only its own columns:
--
-- * update_my_name(): the name shown to the person and their connections.
-- * set_my_preferences(): text size, high contrast and read-aloud speed,
--   saved per account so they come back after signing out and in again.

-- ---------------------------------------------------------------------------
-- preference columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists text_size text not null default 'normal'
    check (text_size in ('normal', 'large', 'larger')),
  add column if not exists high_contrast boolean not null default false,
  add column if not exists read_aloud_rate text not null default 'normal'
    check (read_aloud_rate in ('slow', 'normal'));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.update_my_name(p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_full_name, ''));
begin
  if length(v_name) < 1 or length(v_name) > 100 then
    raise exception 'Please enter a name between 1 and 100 characters.';
  end if;

  update public.profiles set full_name = v_name where id = auth.uid();
  if not found then
    raise exception 'Please finish setting up your account first.';
  end if;
end;
$$;

create or replace function public.set_my_preferences(
  p_text_size text,
  p_high_contrast boolean,
  p_read_aloud_rate text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set text_size = p_text_size,
      high_contrast = coalesce(p_high_contrast, false),
      read_aloud_rate = p_read_aloud_rate
  where id = auth.uid();
  if not found then
    raise exception 'Please finish setting up your account first.';
  end if;
end;
$$;

revoke all on function public.update_my_name(text) from public, anon;
revoke all on function public.set_my_preferences(text, boolean, text) from public, anon;
grant execute on function public.update_my_name(text) to authenticated;
grant execute on function public.set_my_preferences(text, boolean, text) to authenticated;
