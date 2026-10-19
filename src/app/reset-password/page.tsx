"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/lib/supabase/client";

const MIN_LENGTH = 8;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // The reset link signs the person in; without a session the link expired.
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => setHasSession(!!data.session));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Please use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes("different")
          ? "Please choose a password you haven't used before."
          : "We couldn't save your new password. Please try again.",
      );
      return;
    }
    setDone(true);
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Choose a new password
        </h1>
      </div>

      {done ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-accent p-5 text-center"
        >
          <p className="text-lg font-medium">Your password has been changed.</p>
          <Button asChild size="lg">
            <Link href="/dashboard">Continue to GoldenGuide</Link>
          </Button>
        </div>
      ) : hasSession === false ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-center"
        >
          <p>This reset link has expired or was already used.</p>
          <Button asChild size="lg">
            <Link href="/forgot-password">Send a new link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              At least {MIN_LENGTH} characters.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Type it again</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={loading || hasSession === null}
          >
            {loading ? "Saving…" : "Save new password"}
          </Button>
        </form>
      )}
    </main>
  );
}
