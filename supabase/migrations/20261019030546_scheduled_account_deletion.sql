-- Scheduled account deletion for caregivers with a paid Family membership.
--
-- A caregiver who deletes their account can choose to keep using
-- GoldenGuide until the end of the month they've paid for. The server sets
-- deletion_scheduled_for (with the service role key) after canceling the
-- membership at period end; the Stripe webhook and a daily cron then delete
-- the account once that date has passed. Users can't write this column:
-- profiles has no update policy, and update_my_name / set_my_preferences
-- don't touch it. Owners can still read it through profiles_select_own.

alter table public.profiles
  add column if not exists deletion_scheduled_for timestamptz;

-- The daily cron looks up due deletions; most rows are null.
create index if not exists profiles_deletion_scheduled_idx
  on public.profiles (deletion_scheduled_for)
  where deletion_scheduled_for is not null;
