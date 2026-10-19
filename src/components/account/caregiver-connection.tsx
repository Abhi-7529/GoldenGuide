"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormMessage } from "~/components/account/account-shell";
import { IconMessageCircle } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/client";

/** A learner's caregiver, with a careful way to remove the connection. */
export function CaregiverConnection({
  connectionId,
  caregiverName,
}: {
  connectionId: string;
  caregiverName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  async function remove() {
    setRemoving(true);
    setMessage(null);
    const { error } = await createClient()
      .from("connections")
      .delete()
      .eq("id", connectionId);
    setRemoving(false);
    if (error) {
      setMessage({
        kind: "error",
        text: "We couldn't remove the connection. Please try again.",
      });
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold">{caregiverName}</p>
          <p className="text-base text-muted-foreground">
            Your caregiver. They can see your lessons and practice, and choose
            lessons for you.
          </p>
        </div>
        <Button asChild variant="outline" size="lg" className="shrink-0">
          <Link href={`/messages/${connectionId}`}>
            <IconMessageCircle />
            Message
          </Link>
        </Button>
      </div>

      {confirming ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border-2 border-destructive/40 p-4"
        >
          <p className="text-lg font-semibold">
            Remove {caregiverName} as your caregiver?
          </p>
          <ul className="ml-5 flex list-disc flex-col gap-1 text-base">
            <li>
              Your finished lessons, progress and budgets stay with you. Nothing
              is deleted.
            </li>
            <li>
              {caregiverName} will no longer see your progress, and any budget
              you shared stops being shared.
            </li>
            <li>You can connect again later with their invite code.</li>
          </ul>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="destructive"
              size="lg"
              disabled={removing}
              onClick={() => void remove()}
            >
              {removing ? "Removing…" : "Yes, remove the connection"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={removing}
              onClick={() => setConfirming(false)}
            >
              Keep my caregiver
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="lg"
          className="w-fit text-destructive hover:text-destructive"
          onClick={() => setConfirming(true)}
        >
          Remove this connection
        </Button>
      )}
      <FormMessage message={message} />
    </div>
  );
}
