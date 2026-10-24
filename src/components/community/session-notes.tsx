"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { NOTE_LIMITS, type SessionNotes } from "~/lib/community";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

function Counter({ length, limit }: { length: number; limit: number }) {
  const near = length > limit * 0.9;
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        length > limit
          ? "font-semibold text-destructive"
          : near
            ? "text-foreground"
            : "text-muted-foreground",
      )}
      aria-live="polite"
    >
      {length.toLocaleString()} / {limit.toLocaleString()}
    </span>
  );
}

/** The student's notes for one session: private until they share them. */
export function SessionNotesEditor({
  sessionId,
  learnerName,
  caregiverName,
  initial,
}: {
  sessionId: string;
  learnerName: string;
  caregiverName: string;
  initial: SessionNotes | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState(initial?.body ?? "");
  const [nextSteps, setNextSteps] = useState(initial?.next_steps ?? "");
  const [shared, setShared] = useState(Boolean(initial?.shared_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const tooLong =
    body.length > NOTE_LIMITS.body || nextSteps.length > NOTE_LIMITS.nextSteps;

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("save_session_notes", {
      p_session: sessionId,
      p_body: body,
      p_next_steps: nextSteps,
      p_shared: shared,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setSavedAt(
      new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    );
    router.refresh();
  }

  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card"
    >
      <div>
        <h2 className="font-semibold">Session notes</h2>
        <p className="text-sm text-muted-foreground">
          What you taught, what {learnerName} understood, and what to practice
          next. You can come back and edit these any time.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="notesBody">Notes</Label>
          <Counter length={body.length} limit={NOTE_LIMITS.body} />
        </div>
        <Textarea
          id="notesBody"
          value={body}
          onChange={(e) => {
            setSavedAt(null);
            setBody(e.target.value);
          }}
          className="min-h-36"
          placeholder={`e.g. ${learnerName} answered a video call on their own and remembered where the mute button is.`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="notesNext">Recommended next steps</Label>
          <Counter length={nextSteps.length} limit={NOTE_LIMITS.nextSteps} />
        </div>
        <Textarea
          id="notesNext"
          value={nextSteps}
          onChange={(e) => {
            setSavedAt(null);
            setNextSteps(e.target.value);
          }}
          placeholder="e.g. Practice ending a call, and try calling a grandchild."
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
        <input
          type="checkbox"
          checked={shared}
          onChange={(e) => {
            setSavedAt(null);
            setShared(e.target.checked);
          }}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span>
          <strong>
            Share with {learnerName} and {caregiverName}
          </strong>
          <span className="block text-muted-foreground">
            {shared
              ? `${learnerName} and their caregiver ${caregiverName} can read these notes. Nobody else can.`
              : "Private: only you can see these notes until you share them."}
          </span>
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || tooLong}>
          {busy ? "Saving..." : "Save notes"}
        </Button>
        {savedAt && (
          <span
            role="status"
            className="text-sm font-medium text-primary-strong"
          >
            Saved at {savedAt}
            {shared ? " and shared" : ""}
          </span>
        )}
        {tooLong && (
          <span className="text-sm text-destructive">
            Please shorten your notes to save them.
          </span>
        )}
      </div>
    </form>
  );
}

/** Shared notes, read-only, for the caregiver and learner. */
export function SharedSessionNotes({
  notes,
  studentName,
  large = false,
}: {
  notes: Pick<SessionNotes, "body" | "next_steps">;
  studentName: string;
  /** Bigger text, for learners. */
  large?: boolean;
}) {
  if (!notes.body && !notes.next_steps) return null;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-accent/30 p-5",
        large ? "text-lg" : "text-sm",
      )}
    >
      <h3 className={cn("font-semibold", large && "text-xl")}>
        Notes from {studentName}
      </h3>
      {notes.body && <p className="whitespace-pre-line">{notes.body}</p>}
      {notes.next_steps && (
        <div>
          <p className="font-medium">Next steps</p>
          <p className="whitespace-pre-line">{notes.next_steps}</p>
        </div>
      )}
    </div>
  );
}
