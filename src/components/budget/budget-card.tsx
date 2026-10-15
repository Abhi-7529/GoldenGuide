"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { IconArrowRight, IconDots, IconUsers, IconX } from "~/components/icons";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  formatMoney,
  isOwnBudget,
  NAME_MAX,
  perPeriod,
  summarize,
  templateOf,
  toPeriod,
} from "~/lib/budget";
import { formatDay } from "~/lib/progress";
import { createClient } from "~/lib/supabase/client";
import type { PracticeBudget } from "~/lib/types";
import { cn } from "~/lib/utils";

type Panel = "rename" | "share" | "delete" | null;

const itemClass = "min-h-12 gap-3 px-3 text-lg [&_svg]:size-5";

/**
 * One saved budget in the list. Less common actions (rename, copy, share,
 * delete) sit in a "⋯" menu so the card stays simple; each opens a small
 * box in the card to finish or confirm it.
 */
export function BudgetCard({
  budget,
  href,
  openLabel,
  caregiver,
}: {
  budget: PracticeBudget;
  href: string;
  openLabel: string;
  caregiver: { id: string; name: string } | null;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState(budget.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Set when a menu choice opens a box, so focus goes there instead of back
  // to the "⋯" button when the menu closes.
  const openingPanel = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const totals = summarize(budget);
  const left = toPeriod(Math.abs(totals.remaining), budget.period);
  const isShared = !!caregiver && budget.shared_with === caregiver.id;

  function open(next: Panel) {
    setError(null);
    setNotice(null);
    setName(budget.name);
    openingPanel.current = true;
    setPanel(next);
  }

  async function run(
    action: () => PromiseLike<{ error: unknown }>,
    failure: string,
    success?: string,
  ) {
    setBusy(true);
    setError(null);
    const { error: actionError } = await action();
    setBusy(false);
    if (actionError) {
      setError(failure);
      return false;
    }
    setPanel(null);
    if (success) setNotice(success);
    router.refresh();
    return true;
  }

  async function rename(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please type a name.");
      return;
    }
    const supabase = createClient();
    await run(
      () =>
        supabase
          .from("practice_budgets")
          .update({ name: trimmed })
          .eq("id", budget.id),
      "Sorry, we couldn't rename this budget. Please try again.",
      "The new name is saved.",
    );
  }

  async function copy() {
    setNotice(null);
    const supabase = createClient();
    await run(
      () =>
        supabase.from("practice_budgets").insert({
          user_id: budget.user_id,
          name: `Copy of ${budget.name}`.slice(0, NAME_MAX),
          template: budget.template,
          period: budget.period,
          mode: budget.mode,
          income: budget.income,
          expenses: budget.expenses,
          savings_goal: budget.savings_goal,
        }),
      "Sorry, we couldn't make a copy. Please try again.",
      "A copy was made. You'll find it at the top of your list.",
    );
  }

  async function share(on: boolean) {
    if (!caregiver) return;
    const supabase = createClient();
    await run(
      () =>
        supabase
          .from("practice_budgets")
          .update({ shared_with: on ? caregiver.id : null })
          .eq("id", budget.id),
      "Sorry, that didn't work. Please try again.",
      on
        ? `${caregiver.name} can now see this budget.`
        : `This budget is private again. ${caregiver.name} can't see it.`,
    );
  }

  async function remove() {
    const supabase = createClient();
    await run(
      () => supabase.from("practice_budgets").delete().eq("id", budget.id),
      "Sorry, we couldn't delete this budget. Please try again.",
    );
  }

  const cancelButton = (
    <Button
      type="button"
      size="xl"
      variant="outline"
      className="border-2"
      disabled={busy}
      onClick={() => setPanel(null)}
      data-autofocus={panel !== "rename" || undefined}
    >
      {panel === "delete" ? "No, keep it" : "Cancel"}
    </Button>
  );

  return (
    <li className="flex flex-col gap-3 rounded-xl border-2 border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-2xl font-semibold break-words">
              {budget.name}
            </span>
            {isShared && (
              <Badge variant="outline" className="text-base">
                <IconUsers />
                Shared with {caregiver.name}
              </Badge>
            )}
          </span>
          <span className="text-xl">
            {totals.remaining < 0
              ? `Short by ${formatMoney(left)} ${perPeriod(budget.period)}`
              : `${formatMoney(left)} left over ${perPeriod(budget.period)}`}
          </span>
          <span className="text-lg text-muted-foreground">
            {isOwnBudget(budget.template)
              ? "My own numbers"
              : `Made-up example: ${templateOf(budget.template).label}`}{" "}
            · Changed {formatDay(budget.updated_at)}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`More options for ${budget.name}`}
              className="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-background outline-none transition-colors hover:border-primary hover:bg-accent focus-visible:ring-4 focus-visible:ring-ring/50 data-[state=open]:border-primary"
            >
              <IconDots className="size-7" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-60"
            // Focus moves into the box that opens, not back to the button.
            onCloseAutoFocus={(e) => {
              if (!openingPanel.current) return;
              e.preventDefault();
              openingPanel.current = false;
              requestAnimationFrame(() =>
                panelRef.current
                  ?.querySelector<HTMLElement>("[data-autofocus]")
                  ?.focus(),
              );
            }}
          >
            <DropdownMenuItem
              className={itemClass}
              onSelect={() => open("rename")}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className={itemClass}
              disabled={busy}
              onSelect={() => void copy()}
            >
              Make a copy
            </DropdownMenuItem>
            {caregiver && (
              <DropdownMenuItem
                className={itemClass}
                disabled={busy}
                onSelect={() => (isShared ? void share(false) : open("share"))}
              >
                {isShared ? "Stop sharing" : `Share with ${caregiver.name}`}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={cn(
                itemClass,
                "text-destructive focus:bg-destructive/10 focus:text-destructive",
              )}
              onSelect={() => open("delete")}
            >
              <IconX />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={panelRef} className="contents">
        {panel === "rename" && (
          <form
            onSubmit={rename}
            className="flex flex-col gap-3 rounded-xl border-2 border-primary/50 p-4"
          >
            <label
              htmlFor={`rename-${budget.id}`}
              className="text-xl font-semibold"
            >
              New name
            </label>
            <input
              id={`rename-${budget.id}`}
              value={name}
              maxLength={NAME_MAX}
              data-autofocus
              aria-invalid={!name.trim() || undefined}
              onChange={(e) => setName(e.target.value)}
              className="h-14 w-full rounded-lg border-2 border-input bg-background px-3 text-xl outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/40 aria-invalid:border-destructive dark:bg-input/30"
            />
            {error && (
              <p role="alert" className="text-lg font-medium text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" size="xl" disabled={busy}>
                {busy ? "Saving…" : "Save name"}
              </Button>
              {cancelButton}
            </div>
          </form>
        )}

        {panel === "share" && caregiver && (
          <div
            role="alertdialog"
            aria-labelledby={`share-${budget.id}`}
            className="flex flex-col gap-3 rounded-xl border-2 border-primary/50 p-4"
          >
            <p id={`share-${budget.id}`} className="text-xl">
              Share “{budget.name}” with {caregiver.name}? They'll see its saved
              numbers but can't change them. You can stop sharing at any time.
            </p>
            {error && (
              <p role="alert" className="text-lg font-medium text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                size="xl"
                disabled={busy}
                onClick={() => void share(true)}
              >
                Yes, share it
              </Button>
              {cancelButton}
            </div>
          </div>
        )}

        {panel === "delete" && (
          <div
            role="alertdialog"
            aria-labelledby={`delete-${budget.id}`}
            className="flex flex-col gap-3 rounded-xl border-2 border-destructive/60 bg-destructive/5 p-4"
          >
            <p id={`delete-${budget.id}`} className="text-xl font-semibold">
              Delete “{budget.name}” for good?
            </p>
            <p className="text-lg">
              This can't be undone. Your other budgets won't change.
            </p>
            {error && (
              <p role="alert" className="text-lg font-medium text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                size="xl"
                variant="destructive"
                disabled={busy}
                onClick={() => void remove()}
              >
                {busy ? "Deleting…" : "Yes, delete it"}
              </Button>
              {cancelButton}
            </div>
          </div>
        )}
      </div>

      {!panel && error && (
        <p role="alert" className="text-lg font-medium text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-lg font-medium">
          {notice}
        </p>
      )}

      <Button asChild size="xl" className="w-full sm:w-fit">
        <Link href={href}>
          {openLabel}
          <IconArrowRight />
        </Link>
      </Button>
    </li>
  );
}
