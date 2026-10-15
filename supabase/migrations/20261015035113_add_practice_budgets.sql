-- Budget Calculator for GoldenGuide. Learners practice budgeting with made-up
-- example budgets (or their own numbers): income, expenses, a savings goal,
-- and "what if" challenges. It is an educational tool only: no bank
-- connections, no account numbers, no AI. Practice is unlimited on every plan
-- and never touches lesson_completions, so it doesn't count toward the Free
-- daily lesson limit.
--
-- Saved budgets are private to the learner. A learner can choose to share one
-- budget at a time with their connected caregiver (shared_with); the share
-- ends automatically if they disconnect. Caregivers can recommend budgeting
-- activities, and the learner's app marks them done when finished.

-- ---------------------------------------------------------------------------
-- line validation (income and expense lists)
-- ---------------------------------------------------------------------------
-- Each line is {"id": text, "label": text, "amount": number, ...}. Amounts are
-- monthly dollars. Keeps saved data well-formed whatever the browser sends.
create or replace function public.budget_lines_valid(p_lines jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p_lines) = 'array'
    and jsonb_array_length(p_lines) <= 30
    and not jsonb_path_exists(
      p_lines,
      '$[*] ? (@.type() != "object" || !(exists(@.amount)) || !(exists(@.label))
              || @.amount.type() != "number" || @.label.type() != "string"
              || @.amount < 0 || @.amount > 10000000)'
    );
$$;

-- ---------------------------------------------------------------------------
-- practice budgets
-- ---------------------------------------------------------------------------
create table if not exists public.practice_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  template text not null default 'household'
    check (template in ('retirement', 'fixed_income', 'household', 'blank')),
  period text not null default 'monthly'
    check (period in ('weekly', 'monthly', 'yearly')),
  mode text not null default 'simple' check (mode in ('simple', 'advanced')),
  income jsonb not null default '[]'::jsonb
    constraint practice_budgets_income_valid check (public.budget_lines_valid(income)),
  expenses jsonb not null default '[]'::jsonb
    constraint practice_budgets_expenses_valid check (public.budget_lines_valid(expenses)),
  savings_goal numeric(12, 2) not null default 0
    check (savings_goal >= 0 and savings_goal <= 10000000),
  -- The caregiver this budget is shared with, or null for private.
  shared_with uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.practice_budgets enable row level security;

create index if not exists practice_budgets_user_updated_idx
  on public.practice_budgets (user_id, updated_at desc);
create index if not exists practice_budgets_shared_with_idx
  on public.practice_budgets (shared_with);

drop trigger if exists practice_budgets_set_updated_at on public.practice_budgets;
create trigger practice_budgets_set_updated_at
  before update on public.practice_budgets
  for each row execute function public.set_updated_at();

create policy "practice_budgets_select_own" on public.practice_budgets
  for select to authenticated
  using (user_id = auth.uid());

create policy "practice_budgets_select_shared_caregiver" on public.practice_budgets
  for select to authenticated
  using (
    shared_with = auth.uid()
    and exists (
      select 1 from public.connections c
      where c.caregiver_id = auth.uid()
        and c.care_recipient_id = practice_budgets.user_id
    )
  );

create policy "practice_budgets_insert_own" on public.practice_budgets
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      shared_with is null
      or exists (
        select 1 from public.connections c
        where c.caregiver_id = practice_budgets.shared_with
          and c.care_recipient_id = auth.uid()
      )
    )
  );

create policy "practice_budgets_update_own" on public.practice_budgets
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      shared_with is null
      or exists (
        select 1 from public.connections c
        where c.caregiver_id = practice_budgets.shared_with
          and c.care_recipient_id = auth.uid()
      )
    )
  );

create policy "practice_budgets_delete_own" on public.practice_budgets
  for delete to authenticated
  using (user_id = auth.uid());

-- No admin policies: practice budgets stay private to the learner.

-- Disconnecting ends any sharing with that caregiver, so reconnecting later
-- doesn't quietly share old budgets again.
create or replace function public.unshare_budgets_on_disconnect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.practice_budgets
  set shared_with = null
  where user_id = old.care_recipient_id and shared_with = old.caregiver_id;
  return old;
end;
$$;

revoke all on function public.unshare_budgets_on_disconnect() from public, anon, authenticated;

drop trigger if exists connections_unshare_budgets on public.connections;
create trigger connections_unshare_budgets
  after delete on public.connections
  for each row execute function public.unshare_budgets_on_disconnect();

-- ---------------------------------------------------------------------------
-- caregiver-recommended budgeting activities
-- ---------------------------------------------------------------------------
-- Activity ids are also listed in src/lib/budget.ts. Change both together.
create table if not exists public.budget_activity_suggestions (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  care_recipient_id uuid not null references public.profiles (id) on delete cascade,
  activity text not null check (activity in (
    'first_budget', 'savings_goal', 'medical_bill', 'car_repair',
    'grocery_prices', 'heating_bill', 'rent_increase'
  )),
  -- The assigned lesson this activity goes with, if any.
  lesson_id uuid references public.lessons (id) on delete set null,
  note text not null default '' check (length(note) <= 200),
  done_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.budget_activity_suggestions enable row level security;

create index if not exists budget_activity_suggestions_caregiver_idx
  on public.budget_activity_suggestions (caregiver_id);
create index if not exists budget_activity_suggestions_recipient_idx
  on public.budget_activity_suggestions (care_recipient_id, created_at desc);
create index if not exists budget_activity_suggestions_lesson_idx
  on public.budget_activity_suggestions (lesson_id);

create policy "budget_activity_suggestions_select_caregiver" on public.budget_activity_suggestions
  for select to authenticated
  using (caregiver_id = auth.uid());

create policy "budget_activity_suggestions_select_recipient" on public.budget_activity_suggestions
  for select to authenticated
  using (care_recipient_id = auth.uid());

create policy "budget_activity_suggestions_insert_connected_caregiver" on public.budget_activity_suggestions
  for insert to authenticated
  with check (
    caregiver_id = auth.uid()
    and done_at is null
    and exists (
      select 1 from public.connections c
      where c.caregiver_id = auth.uid()
        and c.care_recipient_id = budget_activity_suggestions.care_recipient_id
    )
    and (
      lesson_id is null
      or exists (
        select 1 from public.lessons l
        where l.id = budget_activity_suggestions.lesson_id
          and l.status = 'published'
      )
    )
  );

create policy "budget_activity_suggestions_delete_caregiver" on public.budget_activity_suggestions
  for delete to authenticated
  using (caregiver_id = auth.uid());

-- No update policies: the learner marks an activity done only through
-- finish_budget_activity below, which can change nothing else.
create or replace function public.finish_budget_activity(p_activity text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.budget_activity_suggestions
  set done_at = now()
  where care_recipient_id = auth.uid()
    and activity = p_activity
    and done_at is null;
$$;

revoke all on function public.finish_budget_activity(text) from public, anon;
grant execute on function public.finish_budget_activity(text) to authenticated;
