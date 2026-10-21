"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/client";

export function LeaveCommunityButton({
  caregiverId,
  caregiverName,
}: {
  caregiverId: string;
  caregiverName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("leave_community", {
      p_caregiver: caregiverId,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="w-fit text-destructive hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        Leave
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">
          Leave {caregiverName}'s community? Upcoming sessions are canceled.
          Your verified hours stay.
        </span>
        <Button
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => void leave()}
        >
          {busy ? "Leaving..." : "Yes, leave"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
