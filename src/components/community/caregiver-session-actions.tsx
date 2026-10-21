"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  formatMinutes,
  hasStarted,
  OPEN_STATUSES,
  type Session,
} from "~/lib/community";
import { createClient } from "~/lib/supabase/client";

type Action =
  | "approve"
  | "reject"
  | "cancel"
  | "verify"
  | "request_correction"
  | "dispute";

/** A datetime-local value for an ISO time, in the browser's time zone. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function CaregiverSessionActions({ session }: { session: Session }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which form with a reason is open: decline, cancel, correction or dispute.
  const [noteFor, setNoteFor] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [when, setWhen] = useState(() => toLocalInput(session.scheduled_at));
  const [joinDetails, setJoinDetails] = useState(session.join_details);

  const open = OPEN_STATUSES.includes(session.status);
  // An invitation or request whose time went by before anyone confirmed it.
  const lapsed =
    hasStarted(session) &&
    (session.status === "invited" || session.status === "pending_approval");
  const toVerify =
    session.status === "pending_verification" || session.status === "disputed";

  async function act(action: Action, actionNote = "") {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("caregiver_session_action", {
      p_session: session.id,
      p_action: action,
      p_note: actionNote,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setNoteFor(null);
    setNote("");
    router.refresh();
  }

  async function saveChanges() {
    setError(null);
    const scheduledAt = new Date(when);
    if (Number.isNaN(scheduledAt.getTime())) {
      setError("Please choose a date and time.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("caregiver_update_session", {
      p_session: session.id,
      // Unchanged times keep their exact value, so only a real change sends
      // the session back to the student to confirm.
      p_scheduled_at:
        toLocalInput(session.scheduled_at) === when
          ? session.scheduled_at
          : scheduledAt.toISOString(),
      p_planned_minutes: session.planned_minutes,
      p_join_details: joinDetails,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  const noteCopy: Partial<
    Record<Action, { label: string; prompt: string; confirm: string }>
  > = {
    reject: {
      label: "Decline request",
      prompt: "Reason for the student (optional)",
      confirm: "Decline",
    },
    cancel: {
      label: "Cancel session",
      prompt: "Reason for the student (optional)",
      confirm: "Yes, cancel it",
    },
    request_correction: {
      label: "Ask for a correction",
      prompt: "What needs fixing?",
      confirm: "Send back to student",
    },
    dispute: {
      label: "Dispute",
      prompt: "Why don't you agree with this record?",
      confirm: "Dispute record",
    },
  };
  const noteRequired =
    noteFor === "request_correction" || noteFor === "dispute";

  if (!open && !toVerify) return null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      {lapsed ? (
        <p className="text-sm">
          This time passed before the session was confirmed. Choose a new time
          to send it again, or cancel it.
        </p>
      ) : (
        <>
          {session.status === "pending_approval" && (
            <p className="text-sm">
              {session.student_name} asked for this session. Approve it if the
              time and topic work for {session.learner_name}.
            </p>
          )}
          {session.status === "invited" && (
            <p className="text-sm text-muted-foreground">
              Waiting for {session.student_name} to accept.
            </p>
          )}
        </>
      )}
      {toVerify && (
        <div className="flex flex-col gap-1 text-sm">
          <p>
            {session.student_name} logged{" "}
            <strong>{formatMinutes(session.actual_minutes ?? 0)}</strong> for
            this session. Please check it matches what happened.
          </p>
          <p className="text-muted-foreground">
            Verifying means you confirm it. It isn't a school or organization
            certification.
          </p>
        </div>
      )}

      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newWhen">Date and time</Label>
            <Input
              id="newWhen"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="sm:max-w-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newJoin">How to join</Label>
            <Input
              id="newJoin"
              value={joinDetails}
              maxLength={500}
              onChange={(e) => setJoinDetails(e.target.value)}
              placeholder="e.g. FaceTime on Mom's iPad"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            A new time goes back to the student to confirm.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void saveChanges()}>
              {busy ? "Saving..." : "Save changes"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Never mind
            </Button>
          </div>
        </div>
      ) : noteFor ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="actionNote">{noteCopy[noteFor]?.prompt}</Label>
            <Textarea
              id="actionNote"
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={
                noteFor === "request_correction" ? "default" : "destructive"
              }
              disabled={busy || (noteRequired && !note.trim())}
              onClick={() => void act(noteFor, note)}
            >
              {busy ? "Saving..." : noteCopy[noteFor]?.confirm}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setNoteFor(null);
                setNote("");
              }}
            >
              Never mind
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {session.status === "pending_approval" && !lapsed && (
            <Button disabled={busy} onClick={() => void act("approve")}>
              {busy ? "Approving..." : "Approve"}
            </Button>
          )}
          {toVerify && (
            <Button disabled={busy} onClick={() => void act("verify")}>
              {busy ? "Verifying..." : "Verify time"}
            </Button>
          )}
          {session.status === "pending_verification" && (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setNoteFor("request_correction")}
              >
                {noteCopy.request_correction?.label}
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() => setNoteFor("dispute")}
              >
                {noteCopy.dispute?.label}
              </Button>
            </>
          )}
          {open && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              Change time or joining details
            </Button>
          )}
          {session.status === "pending_approval" && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => setNoteFor("reject")}
            >
              {noteCopy.reject?.label}
            </Button>
          )}
          {open && session.status !== "pending_approval" && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => setNoteFor("cancel")}
            >
              {noteCopy.cancel?.label}
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
