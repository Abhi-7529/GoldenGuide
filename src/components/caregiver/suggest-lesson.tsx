"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { IconCheck } from "~/components/icons";
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

  // Lessons that are no longer published have no title; leave them out.
  const assigned = suggestions.filter((s) => s.lesson_title);
  const notDone = assigned.filter((s) => !s.finished_at);
  const done = assigned.filter((s) => s.finished_at);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Assigned lessons</h3>
          <p className="text-sm text-muted-foreground">
            {recipientName} only sees the lessons you assign here, with no daily
            limit. Their practice follows these lessons.
          </p>
        </div>
        {assigned.length > 0 && (
          <span className="text-sm font-medium">
            {done.length} of {assigned.length} done
          </span>
        )}
      </div>

      {assigned.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven't assigned any lessons yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {[...notDone, ...done].map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
              {s.finished_at ? (
                <span
                  role="img"
                  aria-label="Done"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <IconCheck className="size-4" />
                </span>
              ) : (
                <span
                  role="img"
                  aria-label="Not done yet"
                  className="size-6 shrink-0 rounded-full border-2 border-border"
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">{s.lesson_title}</span>
                <span className="text-xs text-muted-foreground">
                  {s.finished_at
                    ? `Done ${formatDay(s.finished_at)}`
                    : `Not done yet · Assigned ${formatDay(s.created_at)}`}
                </span>
              </div>
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
              <Label htmlFor={`lesson-${recipientId}`}>Assign a lesson</Label>
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
            Assign lesson
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Every published lesson is already assigned.
        </p>
      )}
    </div>
  );
}
