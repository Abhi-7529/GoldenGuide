"use server";

import { revalidatePath } from "next/cache";
import { deleteAccountNow } from "~/lib/account-deletion";
import { stripe, syncSubscription } from "~/lib/stripe";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

type Result =
  | { ok: true; scheduledFor?: string }
  | { ok: false; error: string };

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/**
 * Deletes the signed-in person's account, either right away or (for a
 * caregiver with an active Family membership) at the end of the month
 * they've already paid for.
 */
export async function deleteMyAccount(
  confirmation: string,
  when: "now" | "period_end",
): Promise<Result> {
  if (confirmation.trim().toUpperCase() !== "DELETE") {
    return { ok: false, error: "Please type DELETE to confirm." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin) {
    return {
      ok: false,
      error:
        "Admin accounts can't be deleted here. Ask another admin to remove your admin access first.",
    };
  }

  if (when === "period_end") {
    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("memberships")
      .select("stripe_subscription_id, status, current_period_end")
      .eq("caregiver_id", user.id)
      .maybeSingle();

    const periodEnd = membership?.current_period_end
      ? new Date(membership.current_period_end)
      : null;
    if (
      !membership?.stripe_subscription_id ||
      !ACTIVE_STATUSES.has(membership.status) ||
      !periodEnd ||
      periodEnd.getTime() <= Date.now()
    ) {
      return {
        ok: false,
        error:
          "You don't have a paid month left, so your account can only be deleted right away.",
      };
    }

    let scheduledFor: string;
    try {
      // Stop renewals first, so the scheduled date is never a new charge.
      const subscription = await stripe.subscriptions.update(
        membership.stripe_subscription_id,
        { cancel_at_period_end: true },
      );
      await syncSubscription(subscription);
      const { data: synced } = await admin
        .from("memberships")
        .select("current_period_end")
        .eq("caregiver_id", user.id)
        .single();
      scheduledFor = synced?.current_period_end ?? periodEnd.toISOString();
    } catch (error) {
      console.error(
        "Couldn't cancel a membership before scheduling deletion",
        error instanceof Error ? error.message : "unknown error",
      );
      return {
        ok: false,
        error:
          "We couldn't reach the payment service. Nothing was changed. Please try again in a moment.",
      };
    }

    const { error } = await admin
      .from("profiles")
      .update({ deletion_scheduled_for: scheduledFor })
      .eq("id", user.id);
    if (error) {
      return {
        ok: false,
        error:
          "Your membership was canceled, but we couldn't schedule the deletion. Please try again.",
      };
    }
    revalidatePath("/settings");
    revalidatePath("/caregiver", "layout");
    return { ok: true, scheduledFor };
  }

  try {
    await deleteAccountNow(user.id);
  } catch (error) {
    console.error(
      "Account deletion failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return {
      ok: false,
      error: "We couldn't delete your account. Please try again or contact us.",
    };
  }

  await supabase.auth.signOut();
  return { ok: true };
}

/** Calls off a scheduled deletion. The membership itself isn't renewed. */
export async function keepMyAccount(): Promise<Result> {
  const { user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ deletion_scheduled_for: null })
    .eq("id", user.id);
  if (error) {
    return {
      ok: false,
      error: "We couldn't update your account. Please try again.",
    };
  }
  revalidatePath("/settings");
  revalidatePath("/caregiver", "layout");
  return { ok: true };
}
