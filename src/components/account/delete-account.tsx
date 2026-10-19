"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteMyAccount, keepMyAccount } from "~/app/settings/actions";
import { FormMessage } from "~/components/account/account-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { resetPreferences } from "~/lib/preferences";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

type When = "period_end" | "now";

// UTC, matching the dates Stripe shows for the membership.
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function DeleteAccount({
  isCaregiver,
  familyUntil,
  scheduledFor,
}: {
  isCaregiver: boolean;
  /** End of the paid Family month, when there's one left to use. */
  familyUntil: string | null;
  /** When a deletion is already scheduled. */
  scheduledFor: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState<When>(familyUntil ? "period_end" : "now");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  async function handleDelete(choice: When) {
    setBusy(true);
    setMessage(null);
    const result = await deleteMyAccount(typed, choice);
    if (!result.ok) {
      setBusy(false);
      setMessage({ kind: "error", text: result.error });
      return;
    }
    if (choice === "period_end") {
      setBusy(false);
      setOpen(false);
      setTyped("");
      setMessage({
        kind: "success",
        text: `Done. Your membership won't renew, and your account will be deleted on ${formatDate(result.scheduledFor ?? familyUntil ?? "")}.`,
      });
      router.refresh();
      return;
    }
    // Clear this browser's session and settings too.
    await createClient().auth.signOut();
    resetPreferences();
    window.location.assign("/?account=deleted");
  }

  async function handleKeep() {
    setBusy(true);
    setMessage(null);
    const result = await keepMyAccount();
    setBusy(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    setMessage({
      kind: "success",
      text: 'Your account will be kept. To keep GoldenGuide Family too, choose "Keep my Family membership" on the Membership page.',
    });
    router.refresh();
  }

  const confirmBox = (
    <div className="flex flex-col gap-2">
      <Label htmlFor="delete-confirm">To confirm, type DELETE in the box</Label>
      <Input
        id="delete-confirm"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        className="sm:max-w-xs"
      />
    </div>
  );
  const typedOk = typed.trim().toUpperCase() === "DELETE";

  if (scheduledFor) {
    return (
      <div className="flex flex-col gap-4">
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4"
        >
          <p className="text-lg font-semibold">
            Your account will be deleted on {formatDate(scheduledFor)}.
          </p>
          <p className="text-base">
            You can keep using GoldenGuide until then. Your Family membership
            won&apos;t renew, so you won&apos;t be charged again.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" disabled={busy} onClick={() => void handleKeep()}>
            Keep my account
          </Button>
          {!open && (
            <Button
              variant="ghost"
              size="lg"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => setOpen(true)}
            >
              Delete right away instead…
            </Button>
          )}
        </div>
        {open && (
          <div className="flex flex-col gap-3">
            <p className="text-base">
              This deletes everything now. The rest of your paid month
              isn&apos;t refunded.
            </p>
            {confirmBox}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="destructive"
                size="lg"
                disabled={busy || !typedOk}
                onClick={() => void handleDelete("now")}
              >
                {busy ? "Deleting…" : "Permanently delete now"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setTyped("");
                }}
              >
                Never mind
              </Button>
            </div>
          </div>
        )}
        <FormMessage message={message} />
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          size="lg"
          className="w-fit border-destructive/60 text-destructive hover:bg-destructive/5 hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          Delete my account…
        </Button>
        <FormMessage message={message} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="ml-5 flex list-disc flex-col gap-1.5 text-base">
        <li>
          Your profile, learning progress, budgets and messages will be deleted.
          This can&apos;t be undone.
        </li>
        <li>Any caregiver or learner connections will be removed.</li>
      </ul>

      {familyUntil && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-base font-semibold">
            You&apos;ve paid for GoldenGuide Family until{" "}
            {formatDate(familyUntil)}. When should we delete your account?
          </legend>
          {(
            [
              {
                value: "period_end",
                title: `On ${formatDate(familyUntil)} (recommended)`,
                text: "Keep using GoldenGuide until then. Your membership won't renew, and you can change your mind before that date.",
              },
              {
                value: "now",
                title: "Right away",
                text: "Delete everything now. The rest of your paid month isn't refunded.",
              },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                when === option.value
                  ? "border-primary bg-accent"
                  : "border-border hover:border-primary/50",
              )}
            >
              <input
                type="radio"
                name="delete-when"
                checked={when === option.value}
                onChange={() => setWhen(option.value)}
                className="mt-1 size-5 accent-[var(--primary)]"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-semibold">{option.title}</span>
                <span className="text-sm text-muted-foreground">
                  {option.text}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {!familyUntil && isCaregiver && (
        <p className="text-base text-muted-foreground">
          You don&apos;t have a paid month left, so your account will be deleted
          right away.
        </p>
      )}

      {confirmBox}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="destructive"
          size="lg"
          disabled={busy || !typedOk}
          onClick={() => void handleDelete(when)}
        >
          {busy
            ? "Working…"
            : when === "period_end"
              ? "Schedule my account deletion"
              : "Permanently delete my account"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setTyped("");
            setMessage(null);
          }}
        >
          Keep my account
        </Button>
      </div>
      <FormMessage message={message} />
    </div>
  );
}
