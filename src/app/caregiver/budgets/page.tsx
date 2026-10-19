import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BudgetBreakdown } from "~/components/budget/budget-breakdown";
import { BudgetSummary } from "~/components/budget/budget-summary";
import { SuggestBudgetActivity } from "~/components/caregiver/suggest-budget-activity";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  activitiesForLessons,
  formatMoney,
  isOwnBudget,
  loadActivitySuggestions,
  loadSharedBudgets,
  summarize,
  templateOf,
} from "~/lib/budget";
import { loadLibrary, topicOfLesson } from "~/lib/learning-plan";
import { appDay, loadMembership } from "~/lib/membership";
import { formatDay, loadProgress } from "~/lib/progress";
import { loadSuggestions } from "~/lib/suggestions";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";

export const metadata: Metadata = { title: "Budgets" };

export default async function CaregiverBudgetsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const caregiverId = claimsData?.claims.sub;

  if (!caregiverId) {
    redirect("/login");
  }

  const { data: connections } = await supabase.rpc("get_my_connections");
  const recipients = ((connections as Connection[] | null) ?? []).filter(
    (c) => c.partner_role === "care_recipient",
  );
  const recipientIds = recipients.map((r) => r.partner_id);

  // Each learner's "today" follows their own time zone.
  const { data: dayRows } = await supabase.rpc("my_learners_today");
  const learnerDays = new Map(
    ((dayRows as { learner_id: string; today: string }[] | null) ?? []).map(
      (d) => [d.learner_id, d.today],
    ),
  );
  const todays = [...new Set(learnerDays.values())];
  const [
    { completions },
    library,
    membership,
    { data: pickRows },
    sharedBudgets,
    activitySuggestions,
  ] = await Promise.all([
    loadProgress(supabase, recipientIds),
    loadLibrary(supabase),
    loadMembership(supabase),
    supabase
      .from("daily_lessons")
      .select("care_recipient_id, lesson_id, day")
      .eq("caregiver_id", caregiverId)
      .in("day", todays.length ? todays : [appDay()]),
    // Only budgets a learner chose to share with this caregiver come back.
    loadSharedBudgets(supabase, caregiverId),
    loadActivitySuggestions(supabase, { caregiverId }),
  ]);
  const isFamily = membership.plan === "family";
  const lessonSuggestions = await loadSuggestions(
    supabase,
    { caregiverId },
    completions,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Budgets</h1>
        <p className="text-sm text-muted-foreground">
          Recommend budgeting activities and see the budgets your learners share
          with you. The Budget Calculator is free and unlimited on every plan
          and doesn't use up lessons.
        </p>
      </div>

      {recipients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No one is connected yet. Share your invite code from Manage
            Connection to get started.
          </CardContent>
        </Card>
      ) : (
        recipients.map((r) => {
          const name = r.partner_full_name || "Your learner";
          const today = learnerDays.get(r.partner_id) ?? appDay();
          // The learner's assigned lessons: Family assignments not done yet,
          // or today's picks on Free. Activities that match come first.
          const assignedIds = isFamily
            ? lessonSuggestions
                .filter(
                  (s) => s.care_recipient_id === r.partner_id && !s.finished_at,
                )
                .map((s) => s.lesson_id)
            : (pickRows ?? [])
                .filter(
                  (p) =>
                    p.care_recipient_id === r.partner_id && p.day === today,
                )
                .map((p) => p.lesson_id as string);
          const activities = activitiesForLessons(
            library.lessons
              .filter((l) => assignedIds.includes(l.id))
              .map((l) => ({
                id: l.id,
                title: l.title,
                topic: topicOfLesson(l),
              })),
          );
          const theirSuggestions = activitySuggestions.filter(
            (s) => s.care_recipient_id === r.partner_id,
          );
          const theirBudgets = sharedBudgets.filter(
            (b) => b.user_id === r.partner_id,
          );

          return (
            <Card key={r.connection_id}>
              <CardHeader>
                <h2 className="text-lg font-semibold">{name}</h2>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <section className="flex flex-col gap-3">
                  <div>
                    <h3 className="font-semibold">Recommended activities</h3>
                    <p className="text-sm text-muted-foreground">
                      {name} sees these on their Budget page. They're marked
                      done when {name} finishes them.
                    </p>
                  </div>
                  <SuggestBudgetActivity
                    caregiverId={caregiverId}
                    recipientId={r.partner_id}
                    recipientName={name}
                    activities={activities.map((a) => ({
                      id: a.id,
                      title: a.title,
                      description: a.description,
                      lesson: a.lesson
                        ? { id: a.lesson.id, title: a.lesson.title }
                        : null,
                    }))}
                    suggestions={theirSuggestions}
                  />
                </section>

                <section className="flex flex-col gap-3 border-t border-border pt-5">
                  <div>
                    <h3 className="font-semibold">Shared with you</h3>
                    <p className="text-sm text-muted-foreground">
                      {name}'s budgets are private unless they choose to share
                      one. You can look, but not change anything.
                    </p>
                  </div>
                  {theirBudgets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {name} hasn't shared a budget with you.
                    </p>
                  ) : (
                    theirBudgets.map((b) => {
                      const totals = summarize(b);
                      return (
                        <details
                          key={b.id}
                          className="group rounded-md border border-border"
                        >
                          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-3 text-sm">
                            <span className="font-medium">{b.name}</span>
                            <span className="text-muted-foreground">
                              {totals.remaining < 0
                                ? `Short by ${formatMoney(-totals.remaining)}`
                                : `${formatMoney(totals.remaining)} left over`}{" "}
                              a month · Updated {formatDay(b.updated_at)}
                            </span>
                          </summary>
                          <div className="flex flex-col gap-4 border-t border-border p-3">
                            <p className="text-xs text-muted-foreground">
                              {isOwnBudget(b.template)
                                ? `${name}'s own numbers`
                                : `A made-up example: ${templateOf(b.template).label}`}
                            </p>
                            <BudgetSummary
                              totals={totals}
                              period="monthly"
                              savingsGoal={b.savings_goal}
                              compact
                            />
                            <BudgetBreakdown
                              expenses={b.expenses}
                              totals={totals}
                              period="monthly"
                              showKinds
                              compact
                            />
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="w-fit"
                            >
                              <Link href={`/messages/${r.connection_id}`}>
                                Message {name} about this budget
                              </Link>
                            </Button>
                          </div>
                        </details>
                      );
                    })
                  )}
                </section>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
