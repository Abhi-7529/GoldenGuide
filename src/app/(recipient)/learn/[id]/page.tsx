import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowRight } from "~/components/icons";
import { LessonContent } from "~/components/recipient/lesson-content";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { topicOfLesson } from "~/lib/learning-plan";
import { canOpenLesson, loadLearnerDay } from "~/lib/membership";
import { createClient } from "~/lib/supabase/server";
import type { Lesson } from "~/lib/types";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const lesson = data as Lesson;
  const { data: userData } = await supabase.auth.getUser();

  // Learners can only open their own lessons: their caregiver's choices, or
  // today's lessons when learning alone (the database also refuses to record
  // other lessons as finished).
  if (userData.user) {
    const day = await loadLearnerDay(supabase, userData.user.id);
    if (!canOpenLesson(day, lesson.id)) {
      return (
        <Card className="max-w-2xl border-2">
          <CardContent className="flex flex-col gap-4">
            <h1 className="text-2xl font-semibold">
              {day.unlimited
                ? "This lesson hasn't been chosen for you yet"
                : "This lesson isn't one of today's lessons"}
            </h1>
            <p className="text-xl">
              {day.waitingForCaregiver
                ? "Your caregiver will choose your lessons. Please check back soon."
                : !day.unlimited &&
                    day.todayLessons.length > 0 &&
                    day.todayLessons.every((l) => day.done.has(l.id))
                  ? "You've finished today's lessons. New lessons will be ready tomorrow."
                  : "Your lessons are waiting on your Home page."}
            </p>
            <Button asChild size="xl" className="w-full sm:w-fit">
              <Link href="/home">
                Go to my lessons
                <IconArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    await supabase.from("usage_events").insert({
      user_id: userData.user.id,
      kind: "lesson_view",
      ref_id: lesson.id,
    });
  }

  return (
    <article className="max-w-2xl">
      <LessonContent
        lesson={lesson}
        exitHref="/learn"
        exitLabel="Back to all lessons"
        progressUserId={userData.user?.id}
        practiceHref={
          topicOfLesson(lesson) === "scams"
            ? `/scam-practice?lesson=${lesson.id}`
            : undefined
        }
      />
    </article>
  );
}
