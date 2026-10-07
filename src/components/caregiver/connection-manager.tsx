"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { createClient } from "~/lib/supabase/client";
import type { Connection } from "~/lib/types";

export function ConnectionManager({
  inviteCode,
  connections,
}: {
  inviteCode: string;
  connections: Connection[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRemove(connectionId: string) {
    setRemovingId(connectionId);
    const supabase = createClient();
    await supabase.from("connections").delete().eq("id", connectionId);
    setRemovingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Manage Connection</h1>
        <p className="text-sm text-muted-foreground">
          Share your invite code to connect with the person you're supporting.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Your invite code
            </span>
            <p className="text-2xl font-bold tracking-[0.3em]">{inviteCode}</p>
          </div>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy code"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Connected people
        </h2>

        {connections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No one has connected yet.
            </CardContent>
          </Card>
        ) : (
          connections.map((c) => (
            <Card key={c.connection_id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <span className="font-medium">
                  {c.partner_full_name || "Care recipient"}
                </span>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/messages/${c.connection_id}`}>Message</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={removingId === c.connection_id}
                    onClick={() => handleRemove(c.connection_id)}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
