import Link from "next/link";
import { IconCheck } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { PLANS } from "~/lib/membership";
import { cn } from "~/lib/utils";

// Plan details come from PLANS, the same list the Membership page and
// checkout use, so the landing page can never promise something different.
const plans = [
  {
    id: "free",
    plan: PLANS.free,
    period: "",
    blurb: "Everything you need to support one loved one.",
    cta: "Get Started for Free",
    highlight: false,
  },
  {
    id: "family",
    plan: PLANS.family,
    period: "/month",
    blurb: "For families supporting more than one person.",
    cta: "Start free, upgrade anytime",
    highlight: true,
  },
] as const;

const everyPlan = [
  "Scam Practice, unlimited",
  "Budget Calculator, unlimited",
  "Listen to any lesson",
  "Large text and high contrast",
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="scroll-mt-20 border-y border-border bg-card/60 px-6 py-20 sm:py-24"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
          <p className="text-sm font-semibold tracking-widest text-primary-strong uppercase">
            Membership
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, honest pricing
          </h2>
          <p className="text-xl text-muted-foreground">
            Learners always use GoldenGuide for free. Caregivers can upgrade to
            support more people.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {plans.map(({ id, plan, period, blurb, cta, highlight }) => (
            <div
              key={id}
              className={cn(
                "relative flex flex-col gap-6 rounded-3xl border bg-card p-8 shadow-card transition-shadow motion-safe:hover:shadow-lg",
                highlight
                  ? "border-primary/60 ring-4 ring-primary/15"
                  : "border-border",
              )}
            >
              {highlight && (
                <span className="absolute -top-3.5 left-8 rounded-full bg-primary px-3 py-1 text-xs font-bold tracking-wide text-primary-foreground uppercase">
                  Best for families
                </span>
              )}
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="text-base text-muted-foreground">{blurb}</p>
                <p className="mt-2 font-heading text-5xl font-bold tracking-tight">
                  {plan.price}
                  <span className="ml-1 text-lg font-medium text-muted-foreground">
                    {period || "forever"}
                  </span>
                </p>
                {id === "family" && (
                  <p className="text-sm text-muted-foreground">
                    Plus sales tax where it applies. Cancel anytime.
                  </p>
                )}
              </div>
              <ul className="flex flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-lg">
                    <IconCheck className="mt-1 size-5 shrink-0 text-primary-strong" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="xl"
                variant={highlight ? "default" : "outline"}
                className="mt-auto"
              >
                <Link href="/signup">{cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-background/60 p-6 text-center">
          <p className="text-base font-semibold">Included on every plan</p>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {everyPlan.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-base text-muted-foreground"
              >
                <IconCheck className="size-4 text-primary-strong" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Memberships are bought by caregivers from their Membership page
            after signing up. Learners never see prices or payments.
          </p>
        </div>
      </div>
    </section>
  );
}
