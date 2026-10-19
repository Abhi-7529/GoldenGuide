import "server-only";

import { stripe } from "~/lib/stripe";
import { createAdminClient } from "~/lib/supabase/admin";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Permanently deletes an account and everything linked to it (profile,
 * progress, budgets, messages, connections cascade from auth.users). A
 * still-active Stripe subscription is canceled first so there are no more
 * charges. Throws if either step fails, leaving the account in place.
 */
export async function deleteAccountNow(userId: string) {
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("memberships")
    .select("stripe_subscription_id, status")
    .eq("caregiver_id", userId)
    .maybeSingle();

  if (
    membership?.stripe_subscription_id &&
    ACTIVE_STATUSES.has(membership.status)
  ) {
    const subscription = await stripe.subscriptions.retrieve(
      membership.stripe_subscription_id,
    );
    if (subscription.status !== "canceled") {
      await stripe.subscriptions.cancel(subscription.id);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}

/**
 * Deletes accounts whose scheduled deletion date has passed. Run by the
 * Stripe webhook when a subscription ends and by a daily cron as a backup.
 * If someone renewed their membership after scheduling, their deletion is
 * called off instead.
 */
export async function runDueDeletions() {
  const admin = createAdminClient();
  const { data: due, error } = await admin
    .from("profiles")
    .select("id")
    .not("deletion_scheduled_for", "is", null)
    .lte("deletion_scheduled_for", new Date().toISOString());
  if (error) throw error;

  let deleted = 0;
  let kept = 0;
  let failed = 0;

  for (const { id } of due ?? []) {
    try {
      const { data: membership } = await admin
        .from("memberships")
        .select("stripe_subscription_id")
        .eq("caregiver_id", id)
        .maybeSingle();

      if (membership?.stripe_subscription_id) {
        const subscription = await stripe.subscriptions.retrieve(
          membership.stripe_subscription_id,
        );
        // Renewing means they decided to stay.
        if (
          ACTIVE_STATUSES.has(subscription.status) &&
          !subscription.cancel_at_period_end
        ) {
          await admin
            .from("profiles")
            .update({ deletion_scheduled_for: null })
            .eq("id", id);
          kept++;
          continue;
        }
      }

      await deleteAccountNow(id);
      deleted++;
    } catch (err) {
      // Logged without personal details; the next run tries again.
      console.error(
        "Scheduled account deletion failed",
        err instanceof Error ? err.message : "unknown error",
      );
      failed++;
    }
  }

  return { deleted, kept, failed };
}
