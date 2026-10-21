"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { IconCheck, IconPlus } from "~/components/icons";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { type Invitation, invitationState } from "~/lib/community";
import { createClient } from "~/lib/supabase/client";

const DAY_MS = 24 * 60 * 60 * 1000;

function expiresIn(expiresAt: string) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / DAY_MS);
  return days <= 1 ? "Expires within a day" : `Expires in ${days} days`;
}

function shortDate(when: string) {
  return new Date(when).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function InvitationManager({
  invitations,
  studentNames,
}: {
  invitations: Invitation[];
  /** Display names of students who joined, by id. */
  studentNames: Record<string, string>;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState<{
    id: string;
    code: string;
    label: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOld, setShowOld] = useState(false);

  const open = invitations.filter((i) => invitationState(i) === "open");
  const used = invitations.filter((i) => invitationState(i) === "used");
  const old = invitations.filter((i) =>
    ["canceled", "expired"].includes(invitationState(i)),
  );

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCopied(false);
    setCreating(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase
      .rpc("create_student_invitation", { p_label: label.trim() })
      .single();
    setCreating(false);
    if (rpcError || !data) {
      setError(rpcError?.message ?? "Something went wrong. Please try again.");
      return;
    }
    const created = data as { id: string; code: string };
    setNewCode({ id: created.id, code: created.code, label: label.trim() });
    setLabel("");
    router.refresh();
  }

  async function handleCopy() {
    if (!newCode) return;
    await navigator.clipboard.writeText(newCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCancel(id: string) {
    setError(null);
    setBusyId(id);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc(
      "revoke_student_invitation",
      { p_invitation: id },
    );
    setBusyId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    // A canceled code shouldn't stay on screen as if it could be shared.
    if (newCode?.id === id) setNewCode(null);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Student invitations
      </h2>

      <Card>
        <CardContent className="flex flex-col gap-4 py-6">
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="inviteLabel" className="flex-wrap gap-x-1">
                Who is it for?{" "}
                <span className="font-normal text-muted-foreground">
                  (optional, only you see this)
                </span>
              </Label>
              <Input
                id="inviteLabel"
                value={label}
                maxLength={60}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Maya from church"
              />
            </div>
            <Button type="submit" disabled={creating}>
              <IconPlus />
              {creating ? "Making code..." : "Make invitation code"}
            </Button>
          </form>

          {newCode && (
            <div className="flex flex-col gap-3 rounded-xl border-2 border-primary/60 bg-accent/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    New code{newCode.label ? ` for ${newCode.label}` : ""}
                  </span>
                  <p className="font-mono text-2xl font-bold tracking-[0.2em]">
                    {newCode.code}
                  </p>
                </div>
                <Button variant="outline" onClick={handleCopy}>
                  {copied ? <IconCheck /> : null}
                  {copied ? "Copied!" : "Copy code"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Copy it now: for safety, we don't keep the code and can't show
                it again. It works once, for 7 days. If it's lost, cancel it and
                make a new one.
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {open.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {open.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {invitation.label || "Unnamed invitation"}
                    </span>
                    <span
                      className="text-sm text-muted-foreground"
                      suppressHydrationWarning
                    >
                      Waiting to be used · {expiresIn(invitation.expires_at)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={busyId === invitation.id}
                    onClick={() => void handleCancel(invitation.id)}
                  >
                    {busyId === invitation.id ? "Canceling..." : "Cancel code"}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {used.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {used.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {invitation.label || "Unnamed invitation"}
                    </span>
                    <span
                      className="text-sm text-muted-foreground"
                      suppressHydrationWarning
                    >
                      Used by{" "}
                      {(invitation.consumed_by &&
                        studentNames[invitation.consumed_by]) ||
                        "a student"}{" "}
                      on {shortDate(invitation.consumed_at ?? "")}
                    </span>
                  </div>
                  <Badge variant="secondary">Joined</Badge>
                </li>
              ))}
            </ul>
          )}

          {old.length > 0 && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowOld((v) => !v)}
                className="w-fit text-sm font-medium text-primary-strong underline-offset-4 hover:underline"
                aria-expanded={showOld}
              >
                {showOld ? "Hide" : "Show"} canceled and expired codes (
                {old.length})
              </button>
              {showOld && (
                <ul className="flex flex-col divide-y divide-border">
                  {old.map((invitation) => (
                    <li
                      key={invitation.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm text-muted-foreground"
                    >
                      <span>{invitation.label || "Unnamed invitation"}</span>
                      <Badge variant="outline">
                        {invitationState(invitation) === "canceled"
                          ? "Canceled"
                          : "Expired"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
