"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  announceAccountUpdated,
  FormMessage,
} from "~/components/account/account-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/lib/supabase/client";

export function NameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage({ kind: "error", text: "Please enter your name." });
      return;
    }
    setSaving(true);
    const { error } = await createClient().rpc("update_my_name", {
      p_full_name: trimmed,
    });
    setSaving(false);
    if (error) {
      setMessage({
        kind: "error",
        text: "We couldn't save your name. Please try again.",
      });
      return;
    }
    setName(trimmed);
    setMessage({ kind: "success", text: "Your name is saved." });
    announceAccountUpdated();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Label htmlFor="full-name">Your name</Label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="full-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          autoComplete="name"
          className="sm:flex-1"
        />
        <Button
          type="submit"
          size="lg"
          disabled={saving || name.trim() === initialName}
        >
          {saving ? "Saving…" : "Save name"}
        </Button>
      </div>
      <FormMessage message={message} />
    </form>
  );
}
