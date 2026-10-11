"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loadMembership } from "~/lib/membership";
import {
  ensureCustomer,
  ensurePortalConfiguration,
  getFamilyPriceId,
  getSubscriptionId,
  stripe,
  syncSubscription,
} from "~/lib/stripe";
import { createClient } from "~/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const STRIPE_ERROR =
  "We couldn't reach the payment service. Please try again in a moment.";

/** Only caregivers can buy or manage a membership. */
async function requireCaregiver() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profile?.role !== "caregiver") {
    throw new Error("Only caregivers can manage a membership.");
  }
  return { supabase, user: userData.user };
}

async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Sends the caregiver to Stripe Checkout for GoldenGuide Family. */
export async function startFamilyCheckout() {
  const { supabase, user } = await requireCaregiver();
  const membership = await loadMembership(supabase);
  if (membership.plan === "family") redirect("/caregiver/membership");

  let url: string | null;
  try {
    const [customer, price, origin] = await Promise.all([
      ensureCustomer(user.id, user.email),
      getFamilyPriceId(),
      siteOrigin(),
    ]);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { caregiver_id: user.id },
      subscription_data: { metadata: { caregiver_id: user.id } },
      success_url: `${origin}/caregiver/membership?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/caregiver/membership?checkout=canceled`,
    });
    url = session.url;
  } catch (error) {
    console.error("Stripe checkout failed", error);
    redirect("/caregiver/membership?checkout=error");
  }
  if (!url) redirect("/caregiver/membership?checkout=error");
  redirect(url);
}

/**
 * Confirms a finished checkout with Stripe before granting the plan, so a
 * made-up success link can't unlock anything.
 */
export async function confirmCheckout(sessionId: string) {
  const { user } = await requireCaregiver();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  if (session.client_reference_id !== user.id) return;
  if (session.subscription && typeof session.subscription !== "string") {
    await syncSubscription(session.subscription);
  }
}

async function setCancelAtPeriodEnd(cancel: boolean): Promise<Result> {
  const { user } = await requireCaregiver();
  const subscriptionId = await getSubscriptionId(user.id);
  if (!subscriptionId) {
    return { ok: false, error: "You don't have a Family membership." };
  }
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancel,
    });
    await syncSubscription(subscription);
  } catch (error) {
    console.error("Stripe subscription update failed", error);
    return { ok: false, error: STRIPE_ERROR };
  }
  revalidatePath("/caregiver", "layout");
  return { ok: true };
}

/** Cancels at the end of the paid period; Family stays until then. */
export async function cancelFamily() {
  return setCancelAtPeriodEnd(true);
}

export async function resumeFamily() {
  return setCancelAtPeriodEnd(false);
}

/** Opens Stripe's billing portal for payment details and receipts. */
export async function openBillingPortal() {
  const { user } = await requireCaregiver();
  let url: string;
  try {
    const [customer, configuration, origin] = await Promise.all([
      ensureCustomer(user.id, user.email),
      ensurePortalConfiguration(),
      siteOrigin(),
    ]);
    const session = await stripe.billingPortal.sessions.create({
      customer,
      configuration,
      return_url: `${origin}/caregiver/membership`,
    });
    url = session.url;
  } catch (error) {
    console.error("Stripe billing portal failed", error);
    redirect("/caregiver/membership?portal=error");
  }
  redirect(url);
}
