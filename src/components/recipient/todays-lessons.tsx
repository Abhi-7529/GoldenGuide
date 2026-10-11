import Link from "next/link";
import { IconArrowRight, IconCheck } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import type { PathLesson } from "~/lib/learning-plan";
import { FREE_DAILY_LESSONS } from "~/lib/membership";

/** The lessons a Free learner can do today, with the ones already done. */
export function TodaysLessons({
  lessons,
  doneToday,
  pickerName,
}: {
  lessons: PathLesson[];
  doneToday: Set<string>;
  /** The caregiver who chose today's lessons, if one did. */
  pickerName: string | null;
}) {
  const done = lessons.filter((l) => doneToday.has(l.id)).length;
  const allDone = lessons.length > 0 && done === lessons.length;

  return (
    <Card className="border-2 border-primary/40">
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">Today's lessons</h2>
          <p className="text-lg text-muted-foreground">
            {pickerName
              ? `${pickerName} chose these for you.`
              : "Picked from your learning plan."}{" "}
            {lessons.length > 0 &&
              `You've done ${done} of ${lessons.length} today.`}
          </p>
        </div>

        {allDone && (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 p-4"
          >
            <p className="text-xl font-semibold">
              You've finished today's lessons. Wonderful work!
            </p>
            <p className="text-lg">
              New lessons will be ready tomorrow. You can practice as much as
              you like until then.
            </p>
            <Button asChild size="xl" className="w-full sm:w-fit">
              <Link href="/practice">
                Practice what I learned
                <IconArrowRight />
              </Link>
            </Button>
          </div>
        )}

        {lessons.length === 0 ? (
          <p className="text-xl">
            New lessons are on their way. Please check back soon.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lessons.map((lesson) => {
              const isDone = doneToday.has(lesson.id);
              return (
                <li
                  key={lesson.id}
                  className="flex flex-col gap-3 rounded-xl border-2 border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    {isDone && (
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <IconCheck className="size-5" />
                      </span>
                    )}
                    <div className="flex flex-col">
                      <span className="text-xl font-semibold leading-snug">
                        {lesson.title}
                      </span>
                      <span className="text-base text-muted-foreground">
                        {isDone ? "Done today" : lesson.topic}
                      </span>
                    </div>
                  </div>
                  <Button
                    asChild
                    size="xl"
                    variant={isDone ? "outline" : "default"}
                    className="w-full sm:w-fit"
                  >
                    <Link href={`/learn/${lesson.id}`}>
                      {isDone ? "Read it again" : "Start"}
                      {!isDone && <IconArrowRight />}
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-base text-muted-foreground">
          You can do up to {FREE_DAILY_LESSONS} lessons each day. Practice is
          always unlimited.
        </p>
      </CardContent>
    </Card>
  );
}
