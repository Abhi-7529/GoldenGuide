"use client";

import { useState } from "react";
import { deleteMyAccount } from "~/app/settings/actions";
import { FormMessage } from "~/components/account/account-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { resetPreferences } from "~/lib/preferences";
import { createClient } from "~/lib/supabase/client";

export function DeleteAccount({ isCaregiver }: { isCaregiver: boolean }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setMessage(null);
    const result = await deleteMyAccount(typed);
    if (!result.ok) {
      setDeleting(false);
      setMessage({ kind: "error", text: result.error });
      return;
    }
    // Clear this browser's session and settings too.
    await createClient().auth.signOut();
    resetPreferences();
    window.location.assign("/?account=deleted");
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="lg"
        className="w-fit border-destructive/60 text-destructive hover:bg-destructive/5 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        Delete my account…
      </Button>
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
        {isCaregiver && (
          <li>
            If you have GoldenGuide Family, it will be canceled right away and
            you won&apos;t be charged again.
          </li>
        )}
      </ul>
      <div className="flex flex-col gap-2">
        <Label htmlFor="delete-confirm">
          To confirm, type DELETE in the box
        </Label>
        <Input
          id="delete-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="sm:max-w-xs"
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="destructive"
          size="lg"
          disabled={deleting || typed.trim().toUpperCase() !== "DELETE"}
          onClick={() => void handleDelete()}
        >
          {deleting ? "Deleting…" : "Permanently delete my account"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={deleting}
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
