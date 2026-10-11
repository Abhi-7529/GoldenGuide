"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { FREE_DAILY_LESSONS } from "~/lib/membership";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

/**
 * Free plan: the caregiver picks up to 5 lessons for today. The learner can
 * only finish those lessons, and practice follows them.
 */
export function DailyLessonsPicker({
  caregiverId,
  recipientId,
  recipientName,
  today,
  lessons,
  picked,
  doneToday,
}: {
  caregiverId: string;
  recipientId: string;
  recipientName: string;
  /** YYYY-MM-DD in the app's time zone. */
  today: string;
  /** Recommended lessons first. */
  lessons: { id: string; title: string; finished: boolean }[];
  picked: string[];
  doneToday: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(picked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const changed =
    selected.length !== picked.length ||
    selected.some((id) => !picked.includes(id));
  const full = selected.length >= FREE_DAILY_LESSONS;

  function toggle(id: string) {
    setSaved(false);
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length < FREE_DAILY_LESSONS
          ? [...prev, id]
          : prev,
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const removed = picked.filter((id) => !selected.includes(id));
    const added = selected.filter((id) => !picked.includes(id));

    if (removed.length > 0) {
      const { error: deleteError } = await supabase
        .from("daily_lessons")
        .delete()
        .eq("caregiver_id", caregiverId)
        .eq("care_recipient_id", recipientId)
        .eq("day", today)
        .in("lesson_id", removed);
      if (deleteError) {
        setBusy(false);
        setError(deleteError.message);
        return;
      }
    }
    if (added.length > 0) {
      const { error: insertError } = await supabase
        .from("daily_lessons")
        .insert(
          added.map((lesson_id) => ({
            caregiver_id: caregiverId,
            care_recipient_id: recipientId,
            lesson_id,
          })),
        );
      if (insertError) {
        setBusy(false);
        setError(insertError.message);
        return;
      }
    }
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Today's lessons</h3>
          <p className="text-sm text-muted-foreground">
            Pick up to {FREE_DAILY_LESSONS} lessons for {recipientName} today.
            Their practice will follow these lessons.
            {picked.length === 0 &&
              ` Until you pick, GoldenGuide chooses from ${recipientName}'s learning plan.`}
          </p>
        </div>
        <span className="text-sm font-medium">
          {selected.length} of {FREE_DAILY_LESSONS} picked
        </span>
      </div>

      {lessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          There are no published lessons yet.
        </p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {lessons.map((l, i) => {
            const checked = selected.includes(l.id);
            const done = doneToday.includes(l.id);
            return (
              <li key={l.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent",
                    !checked && full && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={checked}
                    disabled={!checked && full}
                    onChange={() => toggle(l.id)}
                  />
                  <span className="flex-1">{l.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {done
                      ? "Done today ✓"
                      : l.finished
                        ? "Finished before"
                        : i < FREE_DAILY_LESSONS
                          ? "Recommended"
                          : ""}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          disabled={busy || !changed}
          onClick={save}
          className="w-fit"
        >
          {busy ? "Saving..." : "Save today's lessons"}
        </Button>
        {saved && !changed && (
          <span className="text-sm text-primary">Saved</span>
        )}
      </div>
    </div>
  );
}
