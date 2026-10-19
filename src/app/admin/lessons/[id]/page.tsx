import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonForm } from "~/components/admin/lesson-form";
import { createClient } from "~/lib/supabase/server";
import type { Lesson } from "~/lib/types";

export const metadata: Metadata = { title: "Edit lesson" };

export default async function EditLessonPage({
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

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Edit lesson</h2>
      <LessonForm lesson={data as Lesson} />
    </div>
  );
}
