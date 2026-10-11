"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelFamily, resumeFamily } from "~/app/caregiver/membership/actions";
import { Button } from "~/components/ui/button";

/** Cancel (at period end, with a confirm step) or resume a Family plan. */
export function MembershipActions({
  cancelAtPeriodEnd,
  endDate,
}: {
  cancelAtPeriodEnd: boolean;
  endDate: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Shown after a change; the key replays the animation each time.
  const [updated, setUpdated] = useState<{
    key: number;
    detail: string;
  } | null>(null);

  async function run(action: typeof cancelFamily) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    setConfirming(false);
    if (!result.ok) {
      setUpdated(null);
      setError(result.error);
      return;
    }
    setUpdated({
      key: Date.now(),
      detail:
        action === cancelFamily
          ? `Your Family membership will end on ${endDate}.`
          : "Your Family membership will keep renewing.",
    });
    router.refresh();
  }

  const confirmation = updated && (
    <MembershipUpdated key={updated.key} detail={updated.detail} />
  );

  if (cancelAtPeriodEnd) {
    return (
      <div className="flex flex-col gap-2">
        {confirmation}
        <Button
          size="sm"
          className="w-fit"
          disabled={busy}
          onClick={() => run(resumeFamily)}
        >
          {busy ? "Saving..." : "Keep my Family membership"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {confirmation}
      {confirming ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm">
            Your Family membership will stay active until {endDate}, then switch
            to Free. Everyone stays connected and keeps their progress, but
            you'll choose one person to stay active.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => run(cancelFamily)}
            >
              {busy ? "Canceling..." : "Yes, cancel at the end of the period"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Never mind
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={() => setConfirming(true)}
        >
          Cancel membership
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function MembershipUpdated({ detail }: { detail: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground motion-safe:animate-pop-in">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden="true"
        >
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            strokeDasharray={24}
            className="motion-safe:animate-draw-check"
          />
        </svg>
      </span>
      <div>
        <p className="font-medium">Membership updated</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
