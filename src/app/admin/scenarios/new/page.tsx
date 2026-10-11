import { AiScenarioGenerator } from "~/components/admin/ai-scenario-generator";
import { ScenarioForm } from "~/components/admin/scenario-form";
import { createClient } from "~/lib/supabase/server";
import type { Lesson } from "~/lib/types";

export default async function NewScenarioPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { lesson } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, title, status")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const lessons = (data as Pick<Lesson, "id" | "title" | "status">[]) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">New scenario</h2>
      <AiScenarioGenerator lessons={lessons} defaultLessonId={lesson} />
      {lessons.length > 0 && (
        <h3 className="mt-4 font-semibold">Or write it yourself</h3>
      )}
      <ScenarioForm />
    </div>
  );
}
