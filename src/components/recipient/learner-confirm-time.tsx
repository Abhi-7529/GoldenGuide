"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconCheck, IconX } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { createClient } from "~/lib/supabase/client";

/** The learner says whether the time a student logged is right. */
export function LearnerConfirmTime({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [saying, setSaying] = useState<"yes" | "no" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(confirm: boolean) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("learner_confirm_session", {
      p_session: sessionId,
      p_confirm: confirm,
      p_note: note,
    });
    setBusy(false);
    if (rpcError) {
      setError("Sorry, that didn't work. Please try again.");
      return;
    }
    router.refresh();
  }

  if (saying === "yes") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-lg">Confirm that this is right?</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="xl" disabled={busy} onClick={() => void respond(true)}>
            <IconCheck />
            Yes, confirm
          </Button>
          <Button
            size="xl"
            variant="outline"
            disabled={busy}
            onClick={() => setSaying(null)}
          >
            Go back
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-lg text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (saying === "no") {
    return (
      <div className="flex flex-col gap-3">
        <Label htmlFor={`why-${sessionId}`} className="text-lg">
          What wasn't right? (optional)
        </Label>
        <Textarea
          id={`why-${sessionId}`}
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          className="text-lg"
          placeholder="e.g. We only talked for about 10 minutes."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="xl"
            variant="destructive"
            disabled={busy}
            onClick={() => void respond(false)}
          >
            Send
          </Button>
          <Button
            size="xl"
            variant="outline"
            disabled={busy}
            onClick={() => setSaying(null)}
          >
            Go back
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-lg text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button size="xl" onClick={() => setSaying("yes")}>
        <IconCheck />
        Yes, that's right
      </Button>
      <Button size="xl" variant="outline" onClick={() => setSaying("no")}>
        <IconX />
        No, that's not right
      </Button>
    </div>
  );
}
