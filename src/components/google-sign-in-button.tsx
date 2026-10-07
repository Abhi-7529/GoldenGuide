"use client";

import { useState } from "react";
import { IconGoogle } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/client";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Always show Google's account chooser instead of silently reusing
        // whichever Google account this browser is already signed into
        queryParams: { prompt: "select_account" },
      },
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2"
      onClick={handleClick}
      disabled={loading}
    >
      <IconGoogle className="size-4" />
      Continue with Google
    </Button>
  );
}
