"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { createClient } from "~/lib/supabase/client";
import type { ContactInquiry } from "~/lib/types";
import { cn } from "~/lib/utils";

type Filter = "new" | "handled" | "all";

export function InquiryList({ inquiries }: { inquiries: ContactInquiry[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("new");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The message waiting for a "Yes, delete" click. Confirmed on the page,
  // since some browsers block pop-up confirm dialogs.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const shown = inquiries.filter(
    (i) => filter === "all" || i.status === filter,
  );
  const newCount = inquiries.filter((i) => i.status === "new").length;

  async function run(
    id: string,
    action: () => PromiseLike<{ error: unknown }>,
  ) {
    setBusyId(id);
    setError(null);
    const { error } = await action();
    setBusyId(null);
    if (error) {
      setError("That didn't work. Please try again.");
      return;
    }
    router.refresh();
  }

  function setStatus(
    inquiry: ContactInquiry,
    status: ContactInquiry["status"],
  ) {
    const supabase = createClient();
    return run(inquiry.id, () =>
      supabase
        .from("contact_inquiries")
        .update({ status })
        .eq("id", inquiry.id),
    );
  }

  async function remove(inquiry: ContactInquiry) {
    setBusyId(inquiry.id);
    setError(null);
    const { data, error } = await createClient()
      .from("contact_inquiries")
      .delete()
      .eq("id", inquiry.id)
      .select("id");
    setBusyId(null);
    // No error but nothing deleted means the database didn't allow it.
    if (error || !data?.length) {
      setError("That message couldn't be deleted. Please try again.");
      return;
    }
    setConfirmingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["new", "handled", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "new"
              ? `New (${newCount})`
              : f === "handled"
                ? "Handled"
                : "All"}
          </Button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {filter === "new"
              ? "No new messages. Messages from the Contact and Organizations pages show up here."
              : "Nothing here yet."}
          </CardContent>
        </Card>
      ) : (
        shown.map((inquiry) => (
          <Card
            key={inquiry.id}
            className={cn(inquiry.status === "handled" && "opacity-75")}
          >
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    inquiry.kind === "organization" ? "default" : "secondary"
                  }
                >
                  {inquiry.kind === "organization" ? "Organization" : "General"}
                </Badge>
                {inquiry.status === "new" && (
                  <Badge variant="outline">New</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {new Date(inquiry.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <p className="font-semibold">{inquiry.name}</p>
                <a
                  href={`mailto:${inquiry.email}`}
                  className="text-sm text-primary-strong underline underline-offset-4"
                >
                  {inquiry.email}
                </a>
                {(inquiry.organization || inquiry.organization_type) && (
                  <p className="text-sm text-muted-foreground">
                    {[inquiry.organization, inquiry.organization_type]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <p className="whitespace-pre-wrap">{inquiry.message}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === inquiry.id}
                  onClick={() =>
                    setStatus(
                      inquiry,
                      inquiry.status === "new" ? "handled" : "new",
                    )
                  }
                >
                  {inquiry.status === "new" ? "Mark as handled" : "Mark as new"}
                </Button>
                {confirmingId === inquiry.id ? (
                  <span className="flex flex-wrap items-center gap-2 rounded-full border border-destructive/40 py-1 pr-1 pl-3">
                    <span className="text-sm">Delete this message?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === inquiry.id}
                      onClick={() => void remove(inquiry)}
                    >
                      {busyId === inquiry.id ? "Deleting…" : "Yes, delete"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === inquiry.id}
                      onClick={() => setConfirmingId(null)}
                    >
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={busyId === inquiry.id}
                    onClick={() => setConfirmingId(inquiry.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
