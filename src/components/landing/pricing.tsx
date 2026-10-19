import Link from "next/link";
import { IconCheck } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { PLANS } from "~/lib/membership";
import { cn } from "~/lib/utils";

const plans = [
  { id: "free", plan: PLANS.free, period: "", highlight: false },
  { id: "family", plan: PLANS.family, period: "/month", highlight: true },
] as const;

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-20">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple plans
          </h2>
          <p className="max-w-xl text-lg text-muted-foreground">
            Learners always use GoldenGuide for free. Caregivers can upgrade to
            support more people.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map(({ id, plan, period, highlight }) => (
            <Card
              key={id}
              className={cn(
                highlight && "border-primary/60 ring-2 ring-primary/30",
              )}
            >
              <CardContent className="flex h-full flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="font-heading text-4xl font-bold">
                    {plan.price}
                    <span className="text-lg font-medium text-muted-foreground">
                      {period}
                    </span>
                  </p>
                  {id === "family" && (
                    <p className="text-sm text-muted-foreground">
                      Plus sales tax where it applies
                    </p>
                  )}
                </div>
                <ul className="flex flex-col gap-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <IconCheck className="mt-0.5 size-5 shrink-0 text-primary-strong" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  size="lg"
                  variant={highlight ? "default" : "outline"}
                  className="mt-auto"
                >
                  <Link href="/signup">
                    {highlight
                      ? "Start free, upgrade anytime"
                      : "Get started free"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
