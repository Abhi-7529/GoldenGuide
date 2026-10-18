import { redirect } from "next/navigation";
import {
  confirmCheckout,
  openBillingPortal,
  startFamilyCheckout,
} from "~/app/caregiver/membership/actions";
import { MembershipActions } from "~/components/caregiver/membership-actions";
import { IconCheck } from "~/components/icons";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { loadMembership, PLANS, type PlanId } from "~/lib/membership";
import { refreshMembership } from "~/lib/stripe";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";
import { cn } from "~/lib/utils";

const MESSAGES: Record<string, { text: string; error?: boolean }> = {
  success: {
    text: "Welcome to GoldenGuide Family! Your membership is active.",
  },
  canceled: { text: "Checkout was canceled. You haven't been charged." },
  error: {
    text: "We couldn't start checkout. Please try again in a moment.",
    error: true,
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // Check with Stripe before showing the plan, so it's always current.
  try {
    if (
      params.checkout === "success" &&
      typeof params.session_id === "string"
    ) {
      await confirmCheckout(params.session_id);
    } else {
      await refreshMembership(userData.user.id);
    }
  } catch (error) {
    console.error("Couldn't refresh membership from Stripe", error);
  }

  const [membership, { data: connectionRows }] = await Promise.all([
    loadMembership(supabase),
    supabase.rpc("get_my_connections"),
  ]);
  const connected = ((connectionRows as Connection[] | null) ?? []).filter(
    (c) => c.partner_role === "care_recipient",
  ).length;
  const isFamily = membership.plan === "family";
  const message =
    typeof params.checkout === "string" ? MESSAGES[params.checkout] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Membership</h1>
        <p className="text-sm text-muted-foreground">
          Only you can see this page. The people you support never see prices or
          payments.
        </p>
      </div>

      {message && (
        <p
          role="status"
          className={cn(
            "rounded-lg border p-4 text-sm",
            message.error
              ? "border-destructive/40 text-destructive"
              : "border-primary/40 bg-primary/5",
          )}
        >
          {message.text}
        </p>
      )}
      {params.portal === "error" && (
        <p
          role="status"
          className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
        >
          We couldn't open billing details. Please try again in a moment.
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Your plan
            </p>
            <h2 className="text-lg font-semibold">
              {PLANS[membership.plan].name}
            </h2>
          </div>
          <Badge variant={isFamily ? "default" : "outline"}>
            {connected} of {membership.learner_limit}{" "}
            {membership.learner_limit === 1 ? "person" : "people"} connected
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isFamily && membership.current_period_end ? (
            <>
              <p className="text-sm">
                {membership.cancel_at_period_end
                  ? `Your membership ends on ${formatDate(membership.current_period_end)}. After that you'll be on the Free plan.`
                  : `Renews on ${formatDate(membership.current_period_end)} for ${PLANS.family.price} a month.`}
              </p>
              <div className="flex flex-wrap items-start gap-3">
                <MembershipActions
                  cancelAtPeriodEnd={membership.cancel_at_period_end}
                  endDate={formatDate(membership.current_period_end)}
                />
                <form action={openBillingPortal}>
                  <Button type="submit" size="sm" variant="ghost">
                    Payment details and receipts
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <p className="text-sm">
              You're on the Free plan.
              {membership.status !== "none" &&
                " Your Family membership has ended. Everyone's progress is saved."}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {(["free", "family"] as PlanId[]).map((id) => {
          const plan = PLANS[id];
          const current = membership.plan === id;
          return (
            <Card key={id} className={cn(current && "border-2 border-primary")}>
              <CardContent className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {current && <Badge>Current plan</Badge>}
                </div>
                <p>
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground"> / month</span>
                </p>
                <ul className="flex flex-col gap-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <IconCheck className="size-4 shrink-0 text-primary-strong" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {id === "family" && !isFamily && (
                  <form action={startFamilyCheckout} className="mt-auto">
                    <Button type="submit" className="w-full">
                      Upgrade to Family
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Payments are in Stripe test mode. Use card 4242 4242 4242 4242 with any
        future date and any CVC.
      </p>
    </div>
  );
}
