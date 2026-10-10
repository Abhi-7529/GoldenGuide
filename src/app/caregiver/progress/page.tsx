import Link from "next/link";
import { redirect } from "next/navigation";
import { SuggestLesson } from "~/components/caregiver/suggest-lesson";
import { SuggestTopic } from "~/components/caregiver/suggest-topic";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  buildLearningPath,
  loadLibrary,
  loadPlans,
  loadTopicSuggestions,
} from "~/lib/learning-plan";
import {
  bestPerLesson,
  buildWeeklySummary,
  formatDay,
  loadProgress,
  WEEK_MS,
} from "~/lib/progress";
import { loadSuggestions } from "~/lib/suggestions";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";

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
  const [{ completions, attempts }, library, plans, topicSuggestions] =
    await Promise.all([
      loadProgress(supabase, recipientIds),
      loadLibrary(supabase),
      loadPlans(supabase, recipientIds),
      loadTopicSuggestions(supabase, { caregiverId }),
    ]);
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
          const theirCompletions = completions.filter(
            (c) => c.user_id === r.partner_id,
          );
          const theirAttempts = attempts.filter(
            (a) => a.user_id === r.partner_id,
          );
          const summary = buildWeeklySummary(
            name,
            theirCompletions.filter((c) => new Date(c.completed_at) >= weekAgo),
            theirAttempts.filter((a) => new Date(a.created_at) >= weekAgo),
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
          const lastActive = [
            theirCompletions[0]?.completed_at,
            theirAttempts[0]?.created_at,
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
                    <p className="font-medium text-primary">
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
