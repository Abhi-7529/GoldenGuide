import "server-only";

import Stripe from "stripe";
import { env } from "~/env";
import { createAdminClient } from "~/lib/supabase/admin";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

/** Found (or created once, in test mode) by lookup key, so no dashboard setup. */
const FAMILY_PRICE_LOOKUP_KEY = "goldenguide_family_monthly";
const FAMILY_PRICE_CENTS = 799;

export async function getFamilyPriceId() {
  const { data } = await stripe.prices.list({
    lookup_keys: [FAMILY_PRICE_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  if (data[0]) return data[0].id;

  const price = await stripe.prices.create({
    unit_amount: FAMILY_PRICE_CENTS,
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: FAMILY_PRICE_LOOKUP_KEY,
    product_data: { name: "GoldenGuide Family" },
  });
  return price.id;
}

type MembershipRow = {
  caregiver_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: string | null;
};

async function getMembershipRow(caregiverId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("memberships")
    .select(
      "caregiver_id, stripe_customer_id, stripe_subscription_id, status, current_period_end",
    )
    .eq("caregiver_id", caregiverId)
    .maybeSingle();
  return data as MembershipRow | null;
}

/** The caregiver's Stripe customer id, creating the customer on first use. */
export async function ensureCustomer(caregiverId: string, email?: string) {
  const row = await getMembershipRow(caregiverId);
  if (row?.stripe_customer_id) return row.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { caregiver_id: caregiverId },
  });
  const admin = createAdminClient();
  const { error } = await admin
    .from("memberships")
    .upsert(
      { caregiver_id: caregiverId, stripe_customer_id: customer.id },
      { onConflict: "caregiver_id" },
    );
  if (error) throw error;
  return customer.id;
}

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

function isActive(status: string, periodEnd: string | null) {
  return (
    ACTIVE_STATUSES.has(status) &&
    !!periodEnd &&
    new Date(periodEnd).getTime() > Date.now()
  );
}

/** Subscription items carry the billing period in current Stripe API versions. */
function periodEndOf(subscription: Stripe.Subscription) {
  const ends = subscription.items.data.map((i) => i.current_period_end);
  return ends.length ? new Date(Math.max(...ends) * 1000).toISOString() : null;
}

/**
 * Records a subscription's current state from Stripe. This is the only path
 * that grants or removes the Family plan.
 */
export async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  let caregiverId = subscription.metadata.caregiver_id;
  const admin = createAdminClient();
  if (!caregiverId) {
    const { data } = await admin
      .from("memberships")
      .select("caregiver_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    caregiverId = data?.caregiver_id;
  }
  if (!caregiverId) return;

  const periodEnd = periodEndOf(subscription);
  const row = await getMembershipRow(caregiverId);

  // Don't let an old, ended subscription overwrite a newer active one.
  if (
    row?.stripe_subscription_id &&
    row.stripe_subscription_id !== subscription.id &&
    isActive(row.status, row.current_period_end) &&
    !isActive(subscription.status, periodEnd)
  ) {
    return;
  }

  const { error } = await admin.from("memberships").upsert(
    {
      caregiver_id: caregiverId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
    { onConflict: "caregiver_id" },
  );
  if (error) throw error;
}

/**
 * Re-reads the caregiver's subscription from Stripe. Called when they open
 * the Membership page, so changes show up even without the webhook.
 */
export async function refreshMembership(caregiverId: string) {
  const row = await getMembershipRow(caregiverId);
  if (row?.stripe_subscription_id) {
    const subscription = await stripe.subscriptions.retrieve(
      row.stripe_subscription_id,
    );
    await syncSubscription(subscription);
    return;
  }
  if (row?.stripe_customer_id) {
    const { data } = await stripe.subscriptions.list({
      customer: row.stripe_customer_id,
      status: "all",
      limit: 1,
    });
    if (data[0]) await syncSubscription(data[0]);
  }
}

/** The caregiver's current subscription id, if they have one. */
export async function getSubscriptionId(caregiverId: string) {
  return (await getMembershipRow(caregiverId))?.stripe_subscription_id ?? null;
}

/** Test mode has no portal settings until one is saved, so make a default. */
export async function ensurePortalConfiguration() {
  const { data } = await stripe.billingPortal.configurations.list({
    is_default: true,
    limit: 1,
  });
  if (data[0]) return data[0].id;

  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "Manage your GoldenGuide membership" },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
  });
  return configuration.id;
}

/**
 * Re-checks memberships whose paid period has passed but still look active,
 * so a renewal (or cancellation) shows up even if a webhook was missed.
 * Only memberships that actually lapsed hit Stripe, so this is cheap to call
 * on page loads.
 */
export async function refreshLapsedMemberships(caregiverIds: string[]) {
  if (caregiverIds.length === 0) return;
  const admin = createAdminClient();
  const { data } = await admin
    .from("memberships")
    .select("stripe_subscription_id")
    .in("caregiver_id", caregiverIds)
    .in("status", [...ACTIVE_STATUSES])
    .lt("current_period_end", new Date().toISOString())
    .not("stripe_subscription_id", "is", null);

  await Promise.all(
    (data ?? []).map(async (row) => {
      try {
        await syncSubscription(
          await stripe.subscriptions.retrieve(
            row.stripe_subscription_id as string,
          ),
        );
      } catch (error) {
        console.error("Couldn't refresh a lapsed membership", error);
      }
    }),
  );
}
