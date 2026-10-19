"use server";

import { stripe } from "~/lib/stripe";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Permanently deletes the signed-in person's account and everything linked
 * to it (profile, progress, budgets, messages, connections). A caregiver's
 * Family membership is canceled first so they're never charged again.
 */
export async function deleteMyAccount(confirmation: string): Promise<Result> {
  if (confirmation.trim().toUpperCase() !== "DELETE") {
    return { ok: false, error: "Please type DELETE to confirm." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin) {
    return {
      ok: false,
      error:
        "Admin accounts can't be deleted here. Ask another admin to remove your admin access first.",
    };
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("memberships")
    .select("stripe_subscription_id, status")
    .eq("caregiver_id", user.id)
    .maybeSingle();

  if (
    membership?.stripe_subscription_id &&
    ACTIVE_STATUSES.has(membership.status)
  ) {
    try {
      await stripe.subscriptions.cancel(membership.stripe_subscription_id);
    } catch (error) {
      console.error("Couldn't cancel a subscription before deleting", error);
      return {
        ok: false,
        error:
          "We couldn't cancel your membership, so your account wasn't deleted. Please try again in a moment.",
      };
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Account deletion failed", error.message);
    return {
      ok: false,
      error: "We couldn't delete your account. Please try again or contact us.",
    };
  }

  await supabase.auth.signOut();
  return { ok: true };
}
