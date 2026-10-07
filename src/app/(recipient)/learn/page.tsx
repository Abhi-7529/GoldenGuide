import Link from "next/link";
import { IconArrowRight, IconBook } from "~/components/icons";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { loadLearnerSuggestions } from "~/lib/suggestions";
import { createClient } from "~/lib/supabase/server";
import type { Connection, Lesson } from "~/lib/types";

export default async function LearnPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, title, topic, summary")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const lessons =
    (data as Pick<Lesson, "id" | "title" | "topic" | "summary">[] | null) ?? [];

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  const { data: connections } = await supabase.rpc("get_my_connections");
  const suggestedBy = new Map(
    userId
      ? (
          await loadLearnerSuggestions(
            supabase,
            userId,
            (connections as Connection[] | null) ?? [],
          )
        ).map((s) => [s.lesson_id, s.caregiver_name])
      : [],
  );

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
        <div className="grid gap-4 sm:grid-cols-2">
          {lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/learn/${lesson.id}`}
              className="group"
            >
              <Card className="h-full border-2 transition-colors group-hover:border-primary group-hover:bg-accent">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <IconBook className="size-6" />
                    </div>
                    <span className="text-base font-medium text-muted-foreground">
                      {lesson.topic}
                    </span>
                  </div>
                  <h2 className="text-2xl font-semibold leading-snug">
                    {lesson.title}
                  </h2>
                  {suggestedBy.has(lesson.id) && (
                    <Badge className="px-3 py-1 text-base">
                      Suggested by {suggestedBy.get(lesson.id)}
                    </Badge>
                  )}
                  {lesson.summary && (
                    <p className="text-lg">{lesson.summary}</p>
                  )}
                  <span className="mt-auto flex items-center gap-2 pt-2 text-lg font-semibold text-primary">
                    Start this lesson
                    <IconArrowRight className="size-5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
