import Link from "next/link";
import { redirect } from "next/navigation";
import { IconCheck, IconShieldCheck } from "~/components/icons";
import { SimulationPlayer } from "~/components/recipient/simulation-player";
import { PracticeBanner } from "~/components/simulation-frame";
import { Card, CardContent } from "~/components/ui/card";
import { loadLearnerDay } from "~/lib/membership";
import {
  levelLabel,
  listChannels,
  loadSimulationAttempts,
  loadSimulations,
  SIMULATION_LEVELS,
  simulationsForLessons,
  summarizeSimulations,
  unlockedLevels,
} from "~/lib/simulations";
import { createClient } from "~/lib/supabase/server";
import type { LessonLevel } from "~/lib/types";
import { cn } from "~/lib/utils";

export default async function ScamPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; lesson?: string }>;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  // Scam practice is unlimited on every plan and never counts toward the
  // daily lesson limit, so it isn't gated by today's lessons.
  const params = await searchParams;
  const [simulations, attempts, day] = await Promise.all([
    loadSimulations(supabase),
    loadSimulationAttempts(supabase, [userId]),
    loadLearnerDay(supabase, userId),
  ]);
  const summary = summarizeSimulations(attempts);
  const { open, highest, hint } = unlockedLevels(summary);

  // The learner's current lessons: today's (or assigned) lessons plus any
  // finished today. A ?lesson= link from the end of a lesson narrows to it.
  const currentLessons = day.lessons.filter(
    (l) =>
      day.todayLessons.some((t) => t.id === l.id) || day.doneToday.has(l.id),
  );
  const fromLesson = currentLessons.find((l) => l.id === params.lesson);
  const forLessons = simulationsForLessons(
    simulations,
    fromLesson ? [fromLesson] : currentLessons,
    open,
  );

  const chosenLevel = SIMULATION_LEVELS.find(
    (l) => l.id === params.level && open.includes(l.id),
  )?.id;
  const showLessons = !chosenLevel && forLessons.length > 0;
  const level: LessonLevel = chosenLevel ?? highest;
  const queue = showLessons
    ? forLessons.map((s) => ({ ...s.item, reason: s.reason }))
    : simulations.filter((s) => s.level === level);
  const queueKey = showLessons ? `lessons-${fromLesson?.id ?? "all"}` : level;
  // Start at the first practice not tried yet. The order itself stays stable,
  // so refreshing progress mid-way doesn't move the learner's place.
  const startIndex = Math.max(
    0,
    queue.findIndex((s) => !summary.completedIds.has(s.id)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <IconShieldCheck className="size-8 shrink-0 text-primary" />
          Scam Practice
        </h1>
        <p className="text-xl">
          Practice spotting scams in a safe place. Read a pretend text, email,
          phone call or website. Pick what you would do, and learn the warning
          signs.
        </p>
        <PracticeBanner className="w-fit" />
        <p className="text-lg text-muted-foreground">
          Everything here is made up. No links open, no calls are made, and you
          are never asked for real information. Practice as much as you like. It
          doesn't use up your lessons.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-2">
          <CardContent className="flex flex-col gap-1">
            <p className="text-5xl font-bold text-primary">
              {summary.completed}
            </p>
            <p className="text-xl">
              {summary.completed === 1 ? "practice done" : "practices done"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="flex flex-col gap-1">
            <p className="text-5xl font-bold text-primary">
              {summary.accuracy === null
                ? "—"
                : `${Math.round(summary.accuracy * 100)}%`}
            </p>
            <p className="text-xl">safe first choices</p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="flex flex-col gap-1">
            <p className="text-3xl font-bold text-primary">
              {levelLabel(highest)}
            </p>
            <p className="text-xl">your highest level</p>
          </CardContent>
        </Card>
      </div>

      {summary.needsWork.length > 0 && (
        <p className="rounded-xl border-2 border-border bg-muted/40 p-4 text-xl">
          Worth more practice:{" "}
          <span className="font-semibold">
            {listChannels(summary.needsWork)}
          </span>
          .
        </p>
      )}

      <nav aria-label="Practice levels" className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">Choose a level</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {SIMULATION_LEVELS.map((l) => {
            const isOpen = open.includes(l.id);
            const isCurrent = !showLessons && l.id === level;
            const total = simulations.filter((s) => s.level === l.id).length;
            const done = simulations.filter(
              (s) => s.level === l.id && summary.completedIds.has(s.id),
            ).length;
            const content = (
              <>
                <span className="flex items-center gap-2 text-xl font-semibold">
                  {isOpen ? (
                    done > 0 &&
                    done === total && <IconCheck className="size-6" />
                  ) : (
                    <span aria-hidden>🔒</span>
                  )}
                  {l.label}
                </span>
                <span className="text-lg">{l.description}</span>
                <span className="text-base">
                  {isOpen ? `${done} of ${total} done` : "Not open yet"}
                </span>
              </>
            );
            const className = cn(
              "flex min-h-16 flex-col gap-1 rounded-xl border-2 px-4 py-3 text-left",
              isCurrent
                ? "border-primary bg-primary text-primary-foreground"
                : isOpen
                  ? "border-border bg-card hover:border-primary hover:bg-accent"
                  : "border-dashed border-border bg-muted/40 text-muted-foreground",
            );
            return isOpen ? (
              <Link
                key={l.id}
                href={`/scam-practice?level=${l.id}`}
                aria-current={isCurrent ? "true" : undefined}
                className={className}
              >
                {content}
              </Link>
            ) : (
              <div key={l.id} className={className}>
                {content}
              </div>
            );
          })}
        </div>
        {hint && <p className="text-lg text-muted-foreground">{hint}</p>}
        {forLessons.length > 0 && !showLessons && (
          <Link
            href={`/scam-practice${fromLesson ? `?lesson=${fromLesson.id}` : ""}`}
            className="w-fit text-lg font-medium text-primary underline-offset-4 hover:underline"
          >
            Practice that goes with your lessons
          </Link>
        )}
      </nav>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">
          {showLessons
            ? "Practice for your lessons"
            : `${levelLabel(level)} practice`}
        </h2>
        <SimulationPlayer
          key={queueKey}
          simulations={queue}
          startIndex={startIndex}
          userId={userId}
        />
      </section>
    </div>
  );
}
