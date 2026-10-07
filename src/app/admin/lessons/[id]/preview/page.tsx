import { notFound } from "next/navigation";
import { LessonContent } from "~/components/recipient/lesson-content";
import { Badge } from "~/components/ui/badge";
import { createClient } from "~/lib/supabase/server";
import type { Lesson } from "~/lib/types";

export default async function PreviewLessonPage({
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
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const lesson = data as Lesson;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">Learner preview</span>
          <Badge
            variant={lesson.status === "published" ? "default" : "outline"}
          >
            {lesson.status === "published" ? "Published" : "Draft"}
          </Badge>
          <span className="text-muted-foreground">
            Shows the last saved version, exactly as learners will see it.
          </span>
        </div>
      </div>

      <article className="max-w-2xl text-lg">
        <LessonContent
          lesson={lesson}
          exitHref={`/admin/lessons/${lesson.id}`}
          exitLabel="Back to editing"
        />
      </article>
    </div>
  );
}
