"use client";

import { type FormEvent, useState } from "react";
import { FormMessage } from "~/components/account/account-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/lib/supabase/client";

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const next = email.trim();
    if (!next || next.toLowerCase() === currentEmail.toLowerCase()) return;
    setSaving(true);
    const { error } = await createClient().auth.updateUser(
      { email: next },
      // The confirmation link brings people back to this page.
      {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
      },
    );
    setSaving(false);
    if (error) {
      setMessage({
        kind: "error",
        text: error.message.toLowerCase().includes("already")
          ? "That email is already used by another account."
          : "We couldn't change your email. Please check it and try again.",
      });
      return;
    }
    setMessage({
      kind: "success",
      text: `Almost done. We sent a confirmation link to ${next}. Your email changes after you open it.`,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Label htmlFor="email">Email</Label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="sm:flex-1"
        />
        <Button
          type="submit"
          size="lg"
          variant="outline"
          disabled={
            saving ||
            !email.trim() ||
            email.trim().toLowerCase() === currentEmail.toLowerCase()
          }
        >
          {saving ? "Sending…" : "Change email"}
        </Button>
      </div>
      <FormMessage message={message} />
    </form>
  );
}
