"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/lib/supabase/client";

type Result = { ok: true; decision: string } | { ok: false; error: string };

/** The parent or guardian approves (typing their name) or declines. */
export function GuardianDecision({
  token,
  studentName,
}: {
  token: string;
  studentName: string;
}) {
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<string | null>(null);

  async function respond(approve: boolean) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "guardian_consent_respond",
      { p_token: token, p_approve: approve, p_guardian_name: name },
    );
    setBusy(false);
    const result = data as Result | null;
    if (rpcError || !result) {
      setError("Something went wrong. Please try again.");
      return;
    }
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDecision(result.decision);
  }

  if (decision) {
    return (
      <p role="status" className="text-lg">
        {decision === "approved"
          ? `Thank you. ${studentName} can now volunteer with the families who invite them.`
          : `Thank you. ${studentName} won't be able to volunteer on GoldenGuide.`}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="guardianName">Your full name</Label>
        <Input
          id="guardianName"
          value={name}
          maxLength={100}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        I'm {studentName}'s parent or legal guardian, and I agree to them
        volunteering on GoldenGuide as described above.
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy || !name.trim() || !agreed}
          onClick={() => void respond(true)}
        >
          {busy ? "Saving..." : "Approve"}
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void respond(false)}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
