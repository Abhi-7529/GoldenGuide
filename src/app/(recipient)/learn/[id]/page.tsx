import { notFound } from "next/navigation";
import { LessonContent } from "~/components/recipient/lesson-content";
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

  if (userData.user) {
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
      />
    </article>
  );
}
