import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BudgetCard } from "~/components/budget/budget-card";
import { Term } from "~/components/budget/term";
import {
  IconArrowRight,
  IconCalculator,
  IconPlus,
  IconUsers,
} from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  activityOf,
  challengeOf,
  isChallenge,
  loadActivitySuggestions,
  loadBudgets,
  TERMS,
  type TermId,
} from "~/lib/budget";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";

export const metadata: Metadata = { title: "Budget Calculator" };

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string }>;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  // The calculator is unlimited on every plan and never touches lesson
  // completions, so it doesn't count toward the daily lesson limit.
  const params = await searchParams;
  const [budgets, suggestions, { data: connectionRows }] = await Promise.all([
    loadBudgets(supabase, userId),
    loadActivitySuggestions(supabase, { recipientId: userId }),
    supabase.rpc("get_my_connections"),
  ]);
  const caregiver = ((connectionRows as Connection[] | null) ?? [])[0];
  const caregiverName = caregiver?.partner_full_name || "Your caregiver";
  const pending = suggestions.filter(
    (s) => !s.done_at && activityOf(s.activity),
  );
  const latest = budgets[0];
  const challenge = challengeOf(params.challenge);

  function activityHref(activity: (typeof pending)[number]["activity"]) {
    if (activity === "first_budget" || !latest) return "/budget/new";
    if (isChallenge(activity))
      return `/budget/${latest.id}?challenge=${activity}`;
    return `/budget/${latest.id}`;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <IconCalculator className="size-8 shrink-0 text-primary-strong" />
          Budget Calculator
        </h1>
        <p className="text-xl">
          Practice managing your money in a simple, stress-free environment.
          Create a budget, explore different expenses, and see how your
          financial decisions affect your monthly spending and savings.
        </p>
        <p className="rounded-xl border-2 border-border bg-muted/40 p-4 text-lg">
          Plan with your own numbers, or practice with a made-up example. This
          is a planning and learning tool, not a bank or a money service. You
          never need to connect a bank account or share account numbers. Use it
          as much as you like. It doesn't use up your lessons.
        </p>
      </div>

      {pending.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">
            Suggested by {caregiverName}
          </h2>
          {pending.map((s) => {
            const activity = activityOf(s.activity);
            if (!activity) return null;
            return (
              <Card
                key={s.id}
                className="border-2 border-primary/40 bg-primary/5"
              >
                <CardContent className="flex flex-col gap-3">
                  <p className="flex items-center gap-2 text-lg font-medium">
                    <IconUsers className="size-5 shrink-0" />
                    {caregiverName} suggested this for you
                  </p>
                  <p className="text-2xl font-semibold">{activity.title}</p>
                  <p className="text-xl">{activity.learnerDescription}</p>
                  {s.lesson_title && (
                    <p className="text-lg text-muted-foreground">
                      Goes with your lesson “{s.lesson_title}”
                    </p>
                  )}
                  {s.note && (
                    <p className="text-xl italic">
                      “{s.note}” — {caregiverName}
                    </p>
                  )}
                  {isChallenge(s.activity) && !latest && (
                    <p className="text-lg">
                      First, make a budget. Then you can try this challenge on
                      it.
                    </p>
                  )}
                  <Button asChild size="xl" className="w-full sm:w-fit">
                    <Link href={activityHref(s.activity)}>
                      {s.activity === "first_budget" || !latest
                        ? "Make a budget"
                        : isChallenge(s.activity)
                          ? "Try this challenge"
                          : "Open my budget"}
                      <IconArrowRight />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {challenge && budgets.length > 0 && (
        <p className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 text-xl">
          Choose a budget below to try “{challenge.title}”.
        </p>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold">My budgets</h2>
          <Button asChild size="xl" className="w-full sm:w-fit">
            <Link href="/budget/new">
              <IconPlus />
              Make a new budget
            </Link>
          </Button>
        </div>

        {budgets.length === 0 ? (
          <Card className="border-2">
            <CardContent className="flex flex-col gap-4">
              <p className="text-2xl font-semibold">
                You don't have a budget yet
              </p>
              <p className="text-xl">
                We'll walk you through it one step at a time. It takes about
                five minutes.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="xl" className="w-full sm:w-fit">
                  <Link href="/budget/new?template=blank">
                    Use my own numbers
                    <IconArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="xl"
                  variant="outline"
                  className="w-full border-2 sm:w-fit"
                >
                  <Link href="/budget/new">Try a made-up example</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {budgets.map((b) => (
              <BudgetCard
                key={b.id}
                budget={b}
                href={`/budget/${b.id}${challenge ? `?challenge=${challenge.id}` : ""}`}
                openLabel={challenge ? "Use this budget" : "Open"}
                caregiver={
                  caregiver
                    ? { id: caregiver.partner_id, name: caregiverName }
                    : null
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">Words to know</h2>
        <p className="text-lg text-muted-foreground">
          Tap a question to see a short answer.
        </p>
        <div className="flex flex-col gap-1">
          {(Object.keys(TERMS) as TermId[]).map((id) => (
            <Term key={id} id={id} />
          ))}
        </div>
      </section>
    </div>
  );
}
