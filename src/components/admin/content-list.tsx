"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { createClient } from "~/lib/supabase/client";
import type { ContentStatus } from "~/lib/types";

type Item = {
  id: string;
  title: string;
  subtitle: string;
  status: ContentStatus;
  aiGenerated?: boolean;
  needsReview?: boolean;
};

export function ContentList({
  table,
  basePath,
  noun,
  items,
}: {
  table: "lessons" | "practice_scenarios";
  basePath: string;
  noun: string;
  items: Item[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleStatus(item: Item) {
    setBusyId(item.id);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from(table)
      .update({ status: item.status === "published" ? "draft" : "published" })
      .eq("id", item.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", id);
    setBusyId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setConfirmId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} {noun}
          {items.length === 1 ? "" : "s"}
        </p>
        <Button asChild size="sm">
          <Link href={`${basePath}/new`}>New {noun}</Link>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nothing here yet. Create your first {noun}.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const busy = busyId === item.id;
            return (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">
                        {item.title}
                      </span>
                      <Badge
                        variant={
                          item.status === "published" ? "default" : "outline"
                        }
                      >
                        {item.status === "published" ? "Published" : "Draft"}
                      </Badge>
                      {item.needsReview ? (
                        <Badge variant="secondary">Needs review</Badge>
                      ) : (
                        item.aiGenerated && (
                          <Badge variant="outline">AI · Approved</Badge>
                        )
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {item.subtitle}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`${basePath}/${item.id}`}>
                        {item.needsReview ? "Review" : "Edit"}
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        busy ||
                        (item.needsReview && item.status !== "published")
                      }
                      title={
                        item.needsReview && item.status !== "published"
                          ? "Review and approve before publishing"
                          : undefined
                      }
                      onClick={() => toggleStatus(item)}
                    >
                      {item.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    {confirmId === item.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => remove(item.id)}
                        >
                          Confirm delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmId(item.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
