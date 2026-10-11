import Link from "next/link";
import { redirect } from "next/navigation";
import { IconArrowRight, IconCheck } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { canOpenLesson, loadLearnerDay } from "~/lib/membership";
import { bestPerLesson, formatDay } from "~/lib/progress";
import { createClient } from "~/lib/supabase/server";

export default async function MyProgressPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const day = await loadLearnerDay(supabase, userId);
  const { completions, attempts, lessons, path } = day;

  const finished = bestPerLesson(completions);
  // On Free, "next" is the first of today's lessons not done yet.
  const todayNext = day.todayLessons?.find((l) => !day.doneToday.has(l.id));
  const next = day.unlimited
    ? path.lessons[0]
    : todayNext && { item: todayNext, reason: "One of today's lessons" };
  const nextLesson = next?.item;
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
            <p className="text-5xl font-bold text-primary">{finished.length}</p>
            <p className="text-xl">
              {finished.length === 1 ? "lesson finished" : "lessons finished"}
              {lessons.length > 0 && ` out of ${lessons.length}`}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="flex flex-col gap-1">
            <p className="text-5xl font-bold text-primary">{practiced}</p>
            <p className="text-xl">
              {practiced === 1
                ? "money situation practiced"
                : "money situations practiced"}
            </p>
          </CardContent>
        </Card>
      </div>

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
                        className="w-fit text-lg font-medium text-primary underline-offset-4 hover:underline"
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
        !nextLesson &&
        day.unlimited && (
          <Card>
            <CardContent className="py-8 text-center text-xl">
              New lessons are on their way. Please check back soon.
            </CardContent>
          </Card>
        )
      )}

      {day.unlimited && finished.length > 0 && !nextLesson && (
        <p className="text-xl font-medium">
          You've finished every lesson. Wonderful work!
        </p>
      )}
    </div>
  );
}
