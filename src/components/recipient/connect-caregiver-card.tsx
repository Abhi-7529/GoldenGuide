"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/lib/supabase/client";

export function ConnectCaregiverCard() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("redeem_invite_code", {
      p_code: code.trim().toUpperCase(),
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setCode("");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">Connect with a caregiver</h2>
          <p className="text-lg">
            A family member or helper can give you a short code. Type it below
            so they can help you.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="connectCode" className="text-lg">
              Your code
            </Label>
            <Input
              id="connectCode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="For example: 4F2A9C"
              className="h-14 text-xl tracking-widest md:text-xl"
              autoComplete="off"
            />
          </div>
          <Button
            size="xl"
            onClick={handleConnect}
            disabled={loading || !code.trim()}
          >
            {loading ? "Connecting..." : "Connect"}
          </Button>
        </div>

        {error && <p className="text-lg text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
