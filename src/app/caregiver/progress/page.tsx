import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DailyLessonsPicker } from "~/components/caregiver/daily-lessons-picker";
import { MakeActiveButton } from "~/components/caregiver/make-active-button";
import { SuggestLesson } from "~/components/caregiver/suggest-lesson";
import { SuggestTopic } from "~/components/caregiver/suggest-topic";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { loadActivitySuggestions, loadSharedBudgets } from "~/lib/budget";
import {
  buildLearningPath,
  loadLibrary,
  loadPlans,
  loadTopicSuggestions,
} from "~/lib/learning-plan";
import { appDay, loadMembership } from "~/lib/membership";
import {
  bestPerLesson,
  buildWeeklySummary,
  formatDay,
  loadProgress,
  WEEK_MS,
} from "~/lib/progress";
import {
  levelLabel,
  listChannels,
  loadSimulationAttempts,
  summarizeSimulations,
  unlockedLevels,
} from "~/lib/simulations";
import { loadSuggestions } from "~/lib/suggestions";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";

export const metadata: Metadata = { title: "Learning Progress" };

export default async function CaregiverProgressPage() {
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

  const weekAgo = new Date(Date.now() - WEEK_MS);
  const recipientIds = recipients.map((r) => r.partner_id);
  // Each learner's "today" follows their own time zone.
  const { data: dayRows } = await supabase.rpc("my_learners_today");
  const learnerDays = new Map(
    (
      (dayRows as
        | { learner_id: string; time_zone: string; today: string }[]
        | null) ?? []
    ).map((d) => [d.learner_id, d]),
  );
  const todays = [...new Set([...learnerDays.values()].map((d) => d.today))];
  const [
    { completions, attempts },
    library,
    plans,
    topicSuggestions,
    membership,
    { data: pickRows },
    simulationAttempts,
    sharedBudgets,
    budgetSuggestions,
  ] = await Promise.all([
    loadProgress(supabase, recipientIds),
    loadLibrary(supabase),
    loadPlans(supabase, recipientIds),
    loadTopicSuggestions(supabase, { caregiverId }),
    loadMembership(supabase),
    supabase
      .from("daily_lessons")
      .select("care_recipient_id, lesson_id, day")
      .eq("caregiver_id", caregiverId)
      .in("day", todays.length ? todays : [appDay()])
      .order("created_at", { ascending: true }),
    loadSimulationAttempts(supabase, recipientIds),
    // Only budgets a learner chose to share with this caregiver come back.
    loadSharedBudgets(supabase, caregiverId),
    loadActivitySuggestions(supabase, { caregiverId }),
  ]);
  const isFamily = membership.plan === "family";
  const managed = new Set(membership.managed_ids);
  const active = recipients.filter((r) => managed.has(r.partner_id));
  const paused = recipients.filter((r) => !managed.has(r.partner_id));
  const publishedLessons = library.lessons;
  const publishedCount = publishedLessons.length;
  const suggestions = await loadSuggestions(
    supabase,
    { caregiverId },
    completions,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Learning Progress</h1>
        <p className="text-sm text-muted-foreground">
          A weekly summary for each person you support.
        </p>
      </div>

      {paused.length > 0 && (
        <Card className="border-2 border-primary/40">
          <CardContent className="flex flex-col gap-4">
            <div>
              <h2 className="font-semibold">
                {active.length === 0
                  ? "Choose who stays active"
                  : "Paused on the Free plan"}
              </h2>
              <p className="text-sm text-muted-foreground">
                The Free plan includes 1 active learner. Everyone stays
                connected and keeps their progress. Upgrade to Family to help up
                to 3 people at once.
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {paused.map((r) => {
                const name = r.partner_full_name || "Your learner";
                return (
                  <li
                    key={r.connection_id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <span className="font-medium">
                      {name}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · Paused
                      </span>
                    </span>
                    <MakeActiveButton
                      recipientId={r.partner_id}
                      label={
                        active.length === 0
                          ? `Keep ${name} active`
                          : `Make ${name} my active learner`
                      }
                    />
                  </li>
                );
              })}
            </ul>
            <Button asChild size="sm" variant="outline" className="w-fit">
              <Link href="/caregiver/membership">See GoldenGuide Family</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {recipients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No one is connected yet. Share your invite code from Manage
            Connection to get started.
          </CardContent>
        </Card>
      ) : (
        active.map((r) => {
          const name = r.partner_full_name || "Your learner";
          const learnerDay = learnerDays.get(r.partner_id);
          const timeZone = learnerDay?.time_zone;
          const today = learnerDay?.today ?? appDay(new Date(), timeZone);
          const theirCompletions = completions.filter(
            (c) => c.user_id === r.partner_id,
          );
          const theirAttempts = attempts.filter(
            (a) => a.user_id === r.partner_id,
          );
          const theirSimulations = simulationAttempts.filter(
            (a) => a.user_id === r.partner_id,
          );
          const scam = summarizeSimulations(theirSimulations);
          const summary = buildWeeklySummary(
            name,
            theirCompletions.filter((c) => new Date(c.completed_at) >= weekAgo),
            theirAttempts.filter((a) => new Date(a.created_at) >= weekAgo),
            theirSimulations.filter((a) => new Date(a.created_at) >= weekAgo),
          );
          const finished = bestPerLesson(theirCompletions);
          const plan = plans.get(r.partner_id) ?? null;
          const path = buildLearningPath({
            plan,
            ...library,
            completions: theirCompletions,
            attempts: theirAttempts,
          });
          // Recommended lessons first, so the best fit is easy to suggest.
          const lessonOptions = [
            ...path.lessons.map((l) => l.item),
            ...publishedLessons.filter(
              (l) => !path.lessons.some((p) => p.item.id === l.id),
            ),
          ];
          const theirBudgets = sharedBudgets.filter(
            (b) => b.user_id === r.partner_id,
          );
          const theirBudgetActivities = budgetSuggestions.filter(
            (s) => s.care_recipient_id === r.partner_id,
          );
          const budgetActivitiesDone = theirBudgetActivities.filter(
            (s) => s.done_at,
          ).length;
          const lastActive = [
            theirCompletions[0]?.completed_at,
            theirAttempts[0]?.created_at,
            theirSimulations[0]?.created_at,
          ]
            .filter((d): d is string => !!d)
            .sort()
            .at(-1);

          return (
            <Card key={r.connection_id}>
              <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{name}</h2>
                <Badge variant={summary.active ? "default" : "outline"}>
                  {summary.active ? "Active this week" : "Quiet this week"}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    This week
                  </p>
                  {summary.sentences.map((sentence) => (
                    <p key={sentence}>{sentence}</p>
                  ))}
                  {summary.suggestion && (
                    <p className="font-medium text-primary-strong">
                      {summary.suggestion}
                    </p>
                  )}
                </div>

                <dl className="grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Lessons finished</dt>
                    <dd className="text-lg font-semibold">
                      {finished.length}
                      {publishedCount ? ` of ${publishedCount}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      Situations practiced
                    </dt>
                    <dd className="text-lg font-semibold">
                      {new Set(theirAttempts.map((a) => a.scenario_id)).size}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Last active</dt>
                    <dd className="text-lg font-semibold">
                      {lastActive ? formatDay(lastActive) : "Not yet"}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Scam practice
                  </p>
                  {scam.completed === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {name} hasn't tried a pretend scam yet. Scam Practice is
                      free and unlimited on every plan.
                    </p>
                  ) : (
                    <>
                      <dl className="grid gap-4 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-muted-foreground">
                            Pretend scams done
                          </dt>
                          <dd className="text-lg font-semibold">
                            {scam.completed}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">
                            Safe first choice
                          </dt>
                          <dd className="text-lg font-semibold">
                            {Math.round((scam.accuracy ?? 0) * 100)}%
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Level</dt>
                          <dd className="text-lg font-semibold">
                            {levelLabel(unlockedLevels(scam).highest)}
                          </dd>
                        </div>
                      </dl>
                      {scam.needsWork.length > 0 ? (
                        <p className="text-sm font-medium text-primary-strong">
                          Needs more practice with{" "}
                          {listChannels(scam.needsWork)}. You might talk through
                          these together.
                        </p>
                      ) : (
                        scam.strong.length > 0 && (
                          <p className="text-sm">
                            Doing well with {listChannels(scam.strong)}.
                          </p>
                        )
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Budgeting
                    </p>
                    <p className="text-sm">
                      {theirBudgetActivities.length === 0
                        ? "No budget activities recommended yet"
                        : `${budgetActivitiesDone} of ${theirBudgetActivities.length} recommended ${
                            theirBudgetActivities.length === 1
                              ? "activity"
                              : "activities"
                          } done`}
                      {" · "}
                      {theirBudgets.length === 0
                        ? "No shared budgets"
                        : `${theirBudgets.length} shared ${
                            theirBudgets.length === 1 ? "budget" : "budgets"
                          }`}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/caregiver/budgets">Open Budgets</Link>
                  </Button>
                </div>

                <SuggestTopic
                  caregiverId={caregiverId}
                  recipientId={r.partner_id}
                  recipientName={name}
                  plan={plan}
                  path={path}
                  suggestions={topicSuggestions.filter(
                    (s) => s.care_recipient_id === r.partner_id,
                  )}
                />

                {isFamily ? (
                  <SuggestLesson
                    caregiverId={caregiverId}
                    recipientId={r.partner_id}
                    recipientName={name}
                    lessons={lessonOptions.map((l) => ({
                      ...l,
                      finished: finished.some((f) => f.lesson_id === l.id),
                    }))}
                    suggestions={suggestions.filter(
                      (s) => s.care_recipient_id === r.partner_id,
                    )}
                  />
                ) : (
                  <DailyLessonsPicker
                    caregiverId={caregiverId}
                    recipientId={r.partner_id}
                    recipientName={name}
                    today={today}
                    lessons={lessonOptions.map((l) => ({
                      id: l.id,
                      title: l.title,
                      finished: finished.some((f) => f.lesson_id === l.id),
                    }))}
                    picked={(pickRows ?? [])
                      .filter(
                        (p) =>
                          p.care_recipient_id === r.partner_id &&
                          p.day === today,
                      )
                      .map((p) => p.lesson_id as string)}
                    doneToday={theirCompletions
                      .filter((c) => appDay(c.completed_at, timeZone) === today)
                      .map((c) => c.lesson_id)}
                  />
                )}

                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={`/messages/${r.connection_id}`}>
                      Message {name}
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/caregiver/activity">See all activity</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
