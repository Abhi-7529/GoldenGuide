import type { Metadata } from "next";
import { AiLessonGenerator } from "~/components/admin/ai-lesson-generator";
import { LessonForm } from "~/components/admin/lesson-form";

export const metadata: Metadata = { title: "New lesson" };

export default function NewLessonPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">New lesson</h2>
      <AiLessonGenerator />
      <h3 className="mt-4 font-semibold">Or write it yourself</h3>
      <LessonForm />
    </div>
  );
}
