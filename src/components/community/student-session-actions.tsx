"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { hasStarted, OPEN_STATUSES, type Session } from "~/lib/community";
import { createClient } from "~/lib/supabase/client";

const LOGGABLE = [
  "scheduled",
  "correction_requested",
  "pending_verification",
  "verified",
] as const;

export function StudentSessionActions({ session }: { session: Session }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [logging, setLogging] = useState(
    session.status === "correction_requested" ||
      (session.status === "scheduled" && hasStarted(session)),
  );
  const [minutes, setMinutes] = useState(
    String(session.actual_minutes ?? session.planned_minutes),
  );
  const [notes, setNotes] = useState(session.activity_notes);

  const started = hasStarted(session);
  // An invitation or request whose time went by unanswered can't go ahead.
  const lapsed =
    started &&
    (session.status === "invited" || session.status === "pending_approval");
  const open = OPEN_STATUSES.includes(session.status) && !lapsed;
  const canLog =
    started && (LOGGABLE as readonly string[]).includes(session.status);

  async function act(action: "accept" | "decline" | "cancel") {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("student_session_action", {
      p_session: session.id,
      p_action: action,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setConfirmCancel(false);
    router.refresh();
  }

  async function submitHours(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("student_submit_hours", {
      p_session: session.id,
      p_actual_minutes: Number.parseInt(minutes, 10),
      p_activity_notes: notes,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setLogging(false);
    router.refresh();
  }

  if (lapsed) {
    return (
      <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
        This time passed before the session was confirmed, so it didn't go
        ahead. If you'd still like to teach {session.learner_name}, ask for a
        new session.
      </p>
    );
  }

  if (!open && !canLog) return null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      {session.status === "invited" && (
        <p className="text-sm">
          {session.caregiver_name.split(" ")[0]} asked you to teach{" "}
          {session.learner_name}. Can you make it?
        </p>
      )}
      {session.status === "pending_approval" && (
        <p className="text-sm text-muted-foreground">
          Waiting for {session.caregiver_name.split(" ")[0]} to approve your
          request.
        </p>
      )}
      {session.status === "scheduled" && !started && (
        <p className="text-sm text-muted-foreground">
          You're all set. After the session, come back here to log the time you
          gave.
        </p>
      )}
      {session.status === "verified" && !logging && (
        <p className="text-sm text-muted-foreground">
          Need to change this record? It will go back to the caregiver to verify
          again, and won't count until they do.
        </p>
      )}

      {logging ? (
        <form onSubmit={submitHours} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="minutes">Minutes you volunteered</Label>
            <Input
              id="minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="sm:max-w-40"
              required
            />
            <p className="text-sm text-muted-foreground">
              Log the real time, even if it was longer than planned.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">What did you teach?</Label>
            <Textarea
              id="notes"
              value={notes}
              maxLength={2000}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Showed how to attach a photo to an email, then practiced twice."
              required
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Sending..." : "Send for verification"}
            </Button>
            {session.status !== "correction_requested" &&
              session.status !== "scheduled" && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setLogging(false)}
                >
                  Never mind
                </Button>
              )}
          </div>
          <p className="text-sm text-muted-foreground">
            The caregiver checks your record. You can't verify your own hours.
          </p>
        </form>
      ) : confirmCancel ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Cancel this session?</span>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => void act("cancel")}
          >
            {busy ? "Canceling..." : "Yes, cancel"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setConfirmCancel(false)}
          >
            Keep it
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {session.status === "invited" && (
            <>
              <Button disabled={busy} onClick={() => void act("accept")}>
                Accept
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void act("decline")}
              >
                Decline
              </Button>
            </>
          )}
          {canLog && (
            <Button
              variant={session.status === "verified" ? "outline" : "default"}
              onClick={() => setLogging(true)}
            >
              {session.status === "verified" ||
              session.status === "pending_verification"
                ? "Change logged time"
                : "Log my time"}
            </Button>
          )}
          {(session.status === "pending_approval" ||
            (session.status === "scheduled" && !started)) && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => setConfirmCancel(true)}
            >
              Cancel session
            </Button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
