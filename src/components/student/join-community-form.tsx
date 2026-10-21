"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  INVITATION_CODE_PLACEHOLDER,
  type RedeemResult,
} from "~/lib/community";
import { createClient } from "~/lib/supabase/client";

/** An existing student joins another family's community with a new code. */
export function JoinCommunityForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setJoined(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "redeem_student_invitation",
      { p_code: code },
    );
    setLoading(false);
    const result = data as RedeemResult | null;
    if (rpcError || !result) {
      setError(rpcError?.message ?? "Something went wrong. Please try again.");
      return;
    }
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode("");
    setJoined(result.caregiver_name);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="joinCode">Invitation code</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="joinCode"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={INVITATION_CODE_PLACEHOLDER}
            autoComplete="off"
            className="sm:max-w-xs"
          />
          <Button type="submit" disabled={loading || !code.trim()}>
            {loading ? "Checking..." : "Join"}
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {joined && (
        <p role="status" className="text-sm font-medium text-primary-strong">
          You've joined {joined}'s community.
        </p>
      )}
    </form>
  );
}
