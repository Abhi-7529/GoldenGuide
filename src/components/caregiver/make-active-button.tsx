"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/client";

/** On the Free plan, makes this learner the one the caregiver manages. */
export function MakeActiveButton({
  recipientId,
  label,
}: {
  recipientId: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function makeActive() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("set_active_learner", {
      p_recipient: recipientId,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" disabled={busy} onClick={makeActive} className="w-fit">
        {busy ? "Saving..." : label}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
