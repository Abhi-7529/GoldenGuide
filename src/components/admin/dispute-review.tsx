"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { EVENT_LABELS, formatMinutes } from "~/lib/community";
import { createClient } from "~/lib/supabase/client";

export type DisputedSession = {
  id: string;
  topic: string;
  scheduled_at: string;
  planned_minutes: number;
  actual_minutes: number | null;
  student_name: string;
  caregiver_name: string;
  learner_name: string;
  reviewed: boolean;
  admin_note: string;
  history:
    | {
        actor_role: string;
        event: string;
        note: string | null;
        minutes: string | null;
        created_at: string;
      }[]
    | null;
};

/** One disputed session: the facts, its history, and the owner's decision. */
export function DisputeReview({ session }: { session: DisputedSession }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(verify: boolean) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_resolve_session", {
      p_session: session.id,
      p_verify: verify,
      p_note: note,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setNote("");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{session.topic}</p>
            <p className="text-muted-foreground" suppressHydrationWarning>
              {new Date(session.scheduled_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              · {session.student_name} with {session.learner_name} (
              {session.caregiver_name}'s family) · planned{" "}
              {formatMinutes(session.planned_minutes)}, logged{" "}
              {session.actual_minutes
                ? formatMinutes(session.actual_minutes)
                : "nothing"}
            </p>
          </div>
          <Badge variant={session.reviewed ? "secondary" : "destructive"}>
            {session.reviewed ? "Reviewed" : "Needs review"}
          </Badge>
        </div>

        <ol className="flex flex-col gap-1 border-l-2 border-border pl-3">
          {(session.history ?? []).map((h) => (
            <li key={`${h.created_at}-${h.event}`}>
              <span className="font-medium capitalize">{h.actor_role}</span>{" "}
              {EVENT_LABELS[h.event] ?? h.event.replaceAll("_", " ")}
              {h.minutes && ` (${h.minutes} min)`}
              {h.note && `: “${h.note}”`}
            </li>
          ))}
        </ol>

        {session.reviewed ? (
          <p className="text-muted-foreground">
            Decision: “{session.admin_note}”
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`note-${session.id}`}>
              Decision note (required)
            </Label>
            <Textarea
              id={`note-${session.id}`}
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Spoke with the caregiver; 30 minutes is right."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy || !note.trim()}
                onClick={() => void decide(true)}
              >
                Verify the logged time
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !note.trim()}
                onClick={() => void decide(false)}
              >
                Keep disputed (not counted)
              </Button>
            </div>
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
