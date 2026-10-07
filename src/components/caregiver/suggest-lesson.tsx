"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { formatDay } from "~/lib/progress";
import type { LessonSuggestion } from "~/lib/suggestions";
import { createClient } from "~/lib/supabase/client";

const NOTE_MAX = 200;

export function SuggestLesson({
  caregiverId,
  recipientId,
  recipientName,
  lessons,
  suggestions,
}: {
  caregiverId: string;
  recipientId: string;
  recipientName: string;
  lessons: { id: string; title: string; finished: boolean }[];
  suggestions: LessonSuggestion[];
}) {
  const router = useRouter();
  const pendingIds = new Set(
    suggestions.filter((s) => !s.finished_at).map((s) => s.lesson_id),
  );
  const available = lessons.filter((l) => !pendingIds.has(l.id));
  const [lessonId, setLessonId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function suggest(e: FormEvent) {
    e.preventDefault();
    if (!lessonId) {
      setError("Please choose a lesson.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("lesson_suggestions")
      .insert({
        caregiver_id: caregiverId,
        care_recipient_id: recipientId,
        lesson_id: lessonId,
        note: note.trim(),
      });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setLessonId("");
    setNote("");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("lesson_suggestions")
      .delete()
      .eq("id", id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.refresh();
  }

  const shown = suggestions.filter((s) => s.lesson_title).slice(0, 5);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div>
        <h3 className="font-semibold">Suggest a lesson</h3>
        <p className="text-sm text-muted-foreground">
          {recipientName} will see it at the top of their Home page until they
          finish it.
        </p>
      </div>

      {shown.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {shown.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span>
                <span className="font-medium">“{s.lesson_title}”</span>{" "}
                <span className="text-muted-foreground">
                  {s.finished_at
                    ? `· Finished ${formatDay(s.finished_at)} ✓`
                    : `· Suggested ${formatDay(s.created_at)}`}
                </span>
              </span>
              {!s.finished_at && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => remove(s.id)}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <form onSubmit={suggest} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`lesson-${recipientId}`}>Lesson</Label>
              <Select
                id={`lesson-${recipientId}`}
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
              >
                <option value="">Choose a lesson…</option>
                {available.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                    {l.finished ? " (already finished)" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`note-${recipientId}`}>
                Short note (optional)
              </Label>
              <Input
                id={`note-${recipientId}`}
                value={note}
                maxLength={NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. This one made me think of you!"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={busy} className="w-fit">
            Suggest lesson
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Every published lesson is already suggested.
        </p>
      )}
    </div>
  );
}
