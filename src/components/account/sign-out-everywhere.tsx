"use client";

import { useState } from "react";
import { FormMessage } from "~/components/account/account-shell";
import { Button } from "~/components/ui/button";
import { resetPreferences } from "~/lib/preferences";
import { createClient } from "~/lib/supabase/client";

/** Signs the person out on every phone, tablet and computer. */
export function SignOutEverywhere() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signOut({ scope: "global" });
    if (error) {
      setBusy(false);
      setError("We couldn't sign you out everywhere. Please try again.");
      return;
    }
    resetPreferences();
    window.location.assign("/login");
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="lg"
        className="w-fit"
        disabled={busy}
        onClick={() => void handleClick()}
      >
        {busy ? "Signing out…" : "Sign out on all devices"}
      </Button>
      <FormMessage message={error ? { kind: "error", text: error } : null} />
    </div>
  );
}
