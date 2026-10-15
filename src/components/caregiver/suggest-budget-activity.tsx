"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { IconCheck } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import {
  type ActivityId,
  activityOf,
  type BudgetActivitySuggestion,
} from "~/lib/budget";
import { formatDay } from "~/lib/progress";
import { createClient } from "~/lib/supabase/client";

const NOTE_MAX = 200;

/**
 * Recommends Budget Calculator activities to a learner. Activities that go
 * with the learner's assigned lessons are listed first.
 */
export function SuggestBudgetActivity({
  caregiverId,
  recipientId,
  recipientName,
  activities,
  suggestions,
}: {
  caregiverId: string;
  recipientId: string;
  recipientName: string;
  activities: {
    id: ActivityId;
    title: string;
    description: string;
    lesson: { id: string; title: string } | null;
  }[];
  suggestions: BudgetActivitySuggestion[];
}) {
  const router = useRouter();
  const pending = suggestions.filter((s) => !s.done_at);
  const pendingIds = new Set(pending.map((s) => s.activity));
  const available = activities.filter((a) => !pendingIds.has(a.id));
  const [activityId, setActivityId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chosen = activities.find((a) => a.id === activityId);

  async function suggest(e: FormEvent) {
    e.preventDefault();
    if (!chosen) {
      setError("Please choose an activity.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("budget_activity_suggestions")
      .insert({
        caregiver_id: caregiverId,
        care_recipient_id: recipientId,
        activity: chosen.id,
        lesson_id: chosen.lesson?.id ?? null,
        note: note.trim(),
      });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setActivityId("");
    setNote("");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("budget_activity_suggestions")
      .delete()
      .eq("id", id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.refresh();
  }

  const recent = [...pending, ...suggestions.filter((s) => s.done_at)].slice(
    0,
    8,
  );

  return (
    <div className="flex flex-col gap-4">
      {recent.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {recent.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
              {s.done_at ? (
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
                <span className="text-sm font-medium">
                  {activityOf(s.activity)?.title ?? s.activity}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.done_at
                    ? `Done ${formatDay(s.done_at)}`
                    : `Not done yet · Suggested ${formatDay(s.created_at)}`}
                  {s.lesson_title ? ` · Goes with “${s.lesson_title}”` : ""}
                </span>
              </div>
              {!s.done_at && (
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
              <Label htmlFor={`budget-activity-${recipientId}`}>
                Recommend an activity
              </Label>
              <Select
                id={`budget-activity-${recipientId}`}
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
              >
                <option value="">Choose an activity…</option>
                {available.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                    {a.lesson ? ` (goes with “${a.lesson.title}”)` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`budget-note-${recipientId}`}>
                Short note (optional)
              </Label>
              <Input
                id={`budget-note-${recipientId}`}
                value={note}
                maxLength={NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Let's talk about this one on Sunday!"
              />
            </div>
          </div>
          {chosen && (
            <p className="text-sm text-muted-foreground">
              {chosen.description}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={busy} className="w-fit">
            Recommend to {recipientName}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Every activity is already recommended.
        </p>
      )}
    </div>
  );
}
