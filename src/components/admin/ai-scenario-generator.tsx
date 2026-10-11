"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createAiScenarioDrafts } from "~/app/admin/ai-actions";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import type { Lesson } from "~/lib/types";

export function AiScenarioGenerator({
  lessons,
  defaultLessonId,
}: {
  lessons: Pick<Lesson, "id" | "title" | "status">[];
  defaultLessonId?: string;
}) {
  const router = useRouter();
  const [lessonId, setLessonId] = useState(
    lessons.some((l) => l.id === defaultLessonId)
      ? (defaultLessonId as string)
      : (lessons[0]?.id ?? ""),
  );
  const [count, setCount] = useState("2");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!lessonId) {
      setError("Please choose a lesson.");
      return;
    }

    setGenerating(true);
    const result = await createAiScenarioDrafts({
      lessonId,
      count: Number.parseInt(count, 10),
    });

    if (!result.ok) {
      setGenerating(false);
      setError(result.error);
      return;
    }

    router.push("/admin/scenarios");
    router.refresh();
  }

  if (lessons.length === 0) {
    return null;
  }

  return (
    <Card className="max-w-2xl">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <h3 className="font-semibold">Generate from a lesson with AI</h3>
            <p className="text-sm text-muted-foreground">
              AI drafts realistic practice scenarios based on an existing
              lesson. They are saved as drafts marked “Needs review”, and
              learners won't see them until you approve and publish each one.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="ai-lesson">Based on lesson</Label>
              <Select
                id="ai-lesson"
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
              >
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                    {lesson.status === "draft" ? " (draft)" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-count">How many</Label>
              <Select
                id="ai-count"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              >
                {["1", "2", "3", "4"].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={generating} className="w-fit">
            {generating ? "Writing scenarios..." : "Generate scenarios"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
