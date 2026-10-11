import Link from "next/link";
import { redirect } from "next/navigation";
import { IconArrowRight, IconBook } from "~/components/icons";
import { TodaysLessons } from "~/components/recipient/todays-lessons";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { levelLabel, type PathLesson } from "~/lib/learning-plan";
import { loadLearnerDay } from "~/lib/membership";
import { loadLearnerSuggestions } from "~/lib/suggestions";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";
import { cn } from "~/lib/utils";

/** How many picks to show above the full library. */
const RECOMMENDED_COUNT = 3;

export default async function LearnPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const [day, { data: connectionRows }] = await Promise.all([
    loadLearnerDay(supabase, userId),
    supabase.rpc("get_my_connections"),
  ]);
  const connections = (connectionRows as Connection[] | null) ?? [];

  // Free plan: only today's lessons, up to the daily limit.
  if (!day.unlimited) {
    const picker = connections.find((c) => c.partner_id === day.pickedBy);
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Lessons</h1>
          <p className="text-xl">
            Each lesson is short and goes one step at a time.{" "}
            <Link
              href="/plan"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {day.plan ? "Change my plan" : "Make my plan"}
            </Link>
          </p>
        </div>
        <TodaysLessons
          lessons={day.todayLessons}
          doneToday={day.doneToday}
          pickerName={
            day.pickedBy ? picker?.partner_full_name || "Your caregiver" : null
          }
        />
      </div>
    );
  }

  const { plan, lessons, path, completions } = day;
  const suggestedBy = new Map(
    (
      await loadLearnerSuggestions(supabase, userId, connections, completions)
    ).map((s) => [s.lesson_id, s.caregiver_name]),
  );

  const recommended = [
    ...path.lessons.slice(0, RECOMMENDED_COUNT),
    ...path.review.slice(0, 1),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Lessons</h1>
        <p className="text-xl">
          Pick a lesson to read. Each one is short and goes one step at a time.
        </p>
      </div>

      {lessons.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-xl">
            New lessons are on their way. Please check back soon.
          </CardContent>
        </Card>
      ) : (
        <>
          {recommended.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-semibold">Recommended for you</h2>
                <p className="text-lg">
                  {path.levelNote ??
                    (plan
                      ? "Picked to match your learning plan."
                      : "Good lessons to start with.")}{" "}
                  <Link
                    href="/plan"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {plan ? "Change my plan" : "Make my plan"}
                  </Link>
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {recommended.map(({ item, reason }) => (
                  <LessonCard
                    key={item.id}
                    lesson={item}
                    reason={reason}
                    suggestedBy={suggestedBy.get(item.id)}
                    highlight
                  />
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-4">
            {recommended.length > 0 && (
              <h2 className="text-2xl font-semibold">All lessons</h2>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {lessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  suggestedBy={suggestedBy.get(lesson.id)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function LessonCard({
  lesson,
  reason,
  suggestedBy,
  highlight = false,
}: {
  lesson: PathLesson;
  reason?: string;
  suggestedBy?: string;
  highlight?: boolean;
}) {
  return (
    <Link href={`/learn/${lesson.id}`} className="group">
      <Card
        className={cn(
          "h-full border-2 transition-colors group-hover:border-primary",
          highlight
            ? "border-primary/40 bg-primary/5"
            : "group-hover:bg-accent",
        )}
      >
        <CardContent className="flex h-full flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <IconBook className="size-6" />
            </div>
            <span className="text-base font-medium text-muted-foreground">
              {lesson.topic} · {levelLabel(lesson.level)}
            </span>
          </div>
          <h3 className="text-2xl font-semibold leading-snug">
            {lesson.title}
          </h3>
          {reason && <p className="text-lg font-medium">{reason}</p>}
          {suggestedBy && (
            <Badge className="px-3 py-1 text-base">
              Chosen by {suggestedBy}
            </Badge>
          )}
          {lesson.summary && <p className="text-lg">{lesson.summary}</p>}
          <span className="mt-auto flex items-center gap-2 pt-2 text-lg font-semibold text-primary">
            Start this lesson
            <IconArrowRight className="size-5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
