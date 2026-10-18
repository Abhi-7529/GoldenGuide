"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    // Don't reveal whether an account exists; only report real failures.
    if (error && error.status !== 400 && error.status !== 422) {
      setError("We couldn't send the email just now. Please try again soon.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Reset your password
        </h1>
        <p className="text-muted-foreground">
          Enter the email you signed up with. We&apos;ll send you a link to
          choose a new password.
        </p>
      </div>

      {sent ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-accent p-5 text-center"
        >
          <p className="text-lg font-medium">Check your email</p>
          <p className="text-muted-foreground">
            If there&apos;s a GoldenGuide account for {email.trim()},
            you&apos;ll get an email with a link in the next few minutes.
            Remember to check your spam folder.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
