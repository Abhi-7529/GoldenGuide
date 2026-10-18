import Link from "next/link";
import { redirect } from "next/navigation";
import { IconArrowRight, IconCheck, IconShieldCheck } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { canOpenLesson, loadLearnerDay } from "~/lib/membership";
import { bestPerLesson, formatDay } from "~/lib/progress";
import {
  levelLabel,
  listChannels,
  loadSimulationAttempts,
  summarizeSimulations,
  unlockedLevels,
} from "~/lib/simulations";
import { createClient } from "~/lib/supabase/server";

export default async function MyProgressPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const [day, simulationAttempts] = await Promise.all([
    loadLearnerDay(supabase, userId),
    loadSimulationAttempts(supabase, [userId]),
  ]);
  const scam = summarizeSimulations(simulationAttempts);
  const scamLevel = unlockedLevels(scam).highest;
  const { completions, attempts, lessons } = day;

  const finished = bestPerLesson(completions);
  // "Next" is the first of the learner's lessons they haven't done yet.
  const nextLesson = day.todayLessons.find((l) => !day.done.has(l.id));
  const next = nextLesson && {
    item: nextLesson,
    reason: day.unlimited ? "Chosen for you" : "One of today's lessons",
  };
  const practiced = new Set(attempts.map((a) => a.scenario_id)).size;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">My Progress</h1>
        <p className="text-xl">See what you have learned so far.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-2">
          <CardContent className="flex flex-col gap-1">
            <p className="text-5xl font-bold text-primary-strong">
              {finished.length}
            </p>
            <p className="text-xl">
              {finished.length === 1 ? "lesson finished" : "lessons finished"}
              {lessons.length > 0 && ` out of ${lessons.length}`}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="flex flex-col gap-1">
            <p className="text-5xl font-bold text-primary-strong">
              {practiced}
            </p>
            <p className="text-xl">
              {practiced === 1
                ? "money situation practiced"
                : "money situations practiced"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2">
        <CardContent className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <IconShieldCheck className="size-7 shrink-0 text-primary-strong" />
            Scam practice
          </h2>
          {scam.completed === 0 ? (
            <p className="text-xl">
              You haven't tried a pretend scam yet. It's a safe way to learn the
              warning signs.
            </p>
          ) : (
            <>
              <p className="text-xl">
                You tried {scam.completed} pretend{" "}
                {scam.completed === 1 ? "scam" : "scams"} and picked the safe
                choice first time in {scam.safe}. Your level:{" "}
                <span className="font-semibold">{levelLabel(scamLevel)}</span>.
              </p>
              {scam.strong.length > 0 && (
                <p className="text-xl">
                  You're getting good at spotting{" "}
                  <span className="font-semibold">
                    {listChannels(scam.strong)}
                  </span>
                  .
                </p>
              )}
              {scam.needsWork.length > 0 && (
                <p className="text-xl">
                  Worth more practice:{" "}
                  <span className="font-semibold">
                    {listChannels(scam.needsWork)}
                  </span>
                  .
                </p>
              )}
            </>
          )}
          <Button
            asChild
            size="xl"
            variant="outline"
            className="w-full sm:w-fit"
          >
            <Link href="/scam-practice">
              Go to Scam Practice
              <IconArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {next && nextLesson && (
        <Card className="border-2 border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-lg font-medium text-muted-foreground">
                {finished.length === 0
                  ? "A good place to start"
                  : "Try this next"}{" "}
                · {next.reason}
              </p>
              <p className="text-2xl font-semibold">{nextLesson.title}</p>
            </div>
            <Button asChild size="xl" className="w-full sm:w-fit">
              <Link href={`/learn/${nextLesson.id}`}>
                Start this lesson
                <IconArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {finished.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold">Lessons you finished</h2>
          {finished.map((lesson) => (
            <Card key={lesson.lesson_id}>
              <CardContent className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <IconCheck className="size-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xl font-semibold">
                    {lesson.lesson_title ??
                      "A lesson that's no longer available"}
                  </p>
                  <p className="text-lg">
                    {lesson.question_count > 0
                      ? `You got ${lesson.correct_count} out of ${lesson.question_count} questions right.`
                      : "Finished."}{" "}
                    <span className="text-muted-foreground">
                      {formatDay(lesson.completed_at)}
                    </span>
                  </p>
                  {lesson.lesson_title &&
                    canOpenLesson(day, lesson.lesson_id) && (
                      <Link
                        href={`/learn/${lesson.lesson_id}`}
                        className="w-fit text-lg font-medium text-primary-strong underline-offset-4 hover:underline"
                      >
                        Read it again
                      </Link>
                    )}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : (
        !nextLesson && (
          <Card>
            <CardContent className="py-8 text-center text-xl">
              Your lessons will show up here once you start them.
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
