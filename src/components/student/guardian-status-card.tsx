"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { requestGuardianApproval } from "~/app/student/guardian-actions";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { GuardianStatus } from "~/lib/community";

/**
 * Shown to 16- and 17-year-old students until a parent or guardian
 * approves them, with a way to resend or change the parent's email.
 */
export function GuardianStatusCard({
  status,
  lastEmail,
}: {
  status: GuardianStatus;
  /** Where the most recent approval email went, if any. */
  lastEmail: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(lastEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    const result = await requestGuardianApproval(email);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(`Sent to ${email.trim()}.`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-tile-amber-foreground/30 bg-tile-amber p-5 text-tile-amber-foreground shadow-card">
      <div>
        <h2 className="font-semibold text-foreground">
          {status === "declined"
            ? "Your parent or guardian didn't approve"
            : "Waiting for your parent or guardian"}
        </h2>
        <p className="text-sm">
          {status === "declined"
            ? "You can't volunteer with families unless a parent or guardian approves. If something was a mistake, you can send the request again."
            : lastEmail
              ? `We emailed ${lastEmail}. Once they approve, families can choose who you'll help.`
              : "We need to email a parent or guardian to approve you before you can help any family."}
        </p>
      </div>
      <form
        onSubmit={send}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="guardianEmail" className="text-foreground">
            Parent or guardian's email
          </Label>
          <Input
            id="guardianEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={busy || !email.trim()}>
          {busy ? "Sending..." : lastEmail ? "Send again" : "Send"}
        </Button>
      </form>
      {message && (
        <p role="status" className="text-sm font-medium text-foreground">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
