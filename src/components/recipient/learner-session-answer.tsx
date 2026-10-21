"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconCheck, IconX } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/client";

/** "Yes, I'd like this" / "Not this time" for an upcoming session. */
export function LearnerSessionAnswer({
  sessionId,
  answer,
}: {
  sessionId: string;
  answer: "pending" | "yes" | "no";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmNo, setConfirmNo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(wants: boolean) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("learner_session_response", {
      p_session: sessionId,
      p_wants_session: wants,
    });
    setBusy(false);
    if (rpcError) {
      setError("Sorry, that didn't work. Please try again.");
      return;
    }
    setConfirmNo(false);
    router.refresh();
  }

  if (confirmNo) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-lg">
          Skip this session? We'll let your caregiver and the student know.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="xl"
            variant="destructive"
            disabled={busy}
            onClick={() => void respond(false)}
          >
            Yes, skip it
          </Button>
          <Button
            size="xl"
            variant="outline"
            disabled={busy}
            onClick={() => setConfirmNo(false)}
          >
            Keep it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {answer === "yes" ? (
        <p className="flex items-center gap-2 text-lg font-medium">
          <IconCheck className="size-6 text-primary-strong" />
          You said you'd like this session.
        </p>
      ) : (
        <p className="text-lg">Would you like this session?</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        {answer !== "yes" && (
          <Button size="xl" disabled={busy} onClick={() => void respond(true)}>
            <IconCheck />
            Yes, I'd like this
          </Button>
        )}
        <Button
          size="xl"
          variant="outline"
          disabled={busy}
          onClick={() => setConfirmNo(true)}
        >
          <IconX />
          Not this time
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
