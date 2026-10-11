import Link from "next/link";
import { IconArrowRight, IconCheck } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { FREE_DAILY_LESSONS, type LearnerDay } from "~/lib/membership";

/**
 * The lessons a learner can do: today's picks on Free (or from their plan
 * when learning alone), or the lessons their caregiver assigned on Family.
 */
export function TodaysLessons({
  day,
  caregiverName,
}: {
  day: LearnerDay;
  /** The learner's caregiver, if they have one. */
  caregiverName: string | null;
}) {
  const family = day.unlimited;
  const title = family ? "Your lessons" : "Today's lessons";
  const lessons = day.todayLessons;

  if (day.waitingForCaregiver) {
    return (
      <Card className="border-2 border-primary/40">
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-xl">
            {caregiverName ?? "Your caregiver"} will choose your lessons
            {family ? "" : " for today"}. Please check back soon.
          </p>
          <p className="text-lg text-muted-foreground">
            You can use the button at the top to ask them for help.
          </p>
        </CardContent>
      </Card>
    );
  }

  const done = lessons.filter((l) => day.done.has(l.id)).length;
  const allDone = lessons.length > 0 && done === lessons.length;
  const chosenBy = family || day.pickedBy ? caregiverName : null;

  return (
    <Card className="border-2 border-primary/40">
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-lg text-muted-foreground">
            {chosenBy
              ? `${chosenBy} chose these for you.`
              : "Picked from your learning plan."}{" "}
            {lessons.length > 0 &&
              (family
                ? `You've finished ${done} of ${lessons.length}.`
                : `You've done ${done} of ${lessons.length} today.`)}
          </p>
        </div>

        {allDone && (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 p-4"
          >
            <p className="text-xl font-semibold">
              {family
                ? "You've finished all your lessons. Wonderful work!"
                : "You've finished today's lessons. Wonderful work!"}
            </p>
            <p className="text-lg">
              {family
                ? `${chosenBy ?? "Your caregiver"} can add more. You can practice as much as you like.`
                : "New lessons will be ready tomorrow. You can practice as much as you like until then."}
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
              const isDone = day.done.has(lesson.id);
              const note = day.notes.get(lesson.id);
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
                        {isDone
                          ? family
                            ? "Finished"
                            : "Done today"
                          : lesson.topic}
                      </span>
                      {note && !isDone && (
                        <span className="text-lg italic">
                          “{note}” — {caregiverName ?? "Your caregiver"}
                        </span>
                      )}
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
          {family
            ? "There's no daily limit. Practice is always unlimited."
            : `You can do up to ${FREE_DAILY_LESSONS} lessons each day. Practice is always unlimited.`}
        </p>
      </CardContent>
    </Card>
  );
}
