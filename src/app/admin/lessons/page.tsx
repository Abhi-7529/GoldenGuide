import type { Metadata } from "next";
import { ContentList } from "~/components/admin/content-list";
import { levelLabel } from "~/lib/learning-plan";
import { createClient } from "~/lib/supabase/server";
import type { Lesson } from "~/lib/types";

export const metadata: Metadata = { title: "Lessons" };

export default async function AdminLessonsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const lessons = (data as Lesson[] | null) ?? [];

  return (
    <ContentList
      table="lessons"
      basePath="/admin/lessons"
      noun="lesson"
      items={lessons.map((l) => ({
        id: l.id,
        title: l.title,
        subtitle: `${l.topic} · ${levelLabel(l.level)}${l.summary ? ` · ${l.summary}` : ""}`,
        status: l.status,
        aiGenerated: l.ai_generated,
        needsReview: l.ai_generated && !l.approved_at,
      }))}
    />
  );
}
