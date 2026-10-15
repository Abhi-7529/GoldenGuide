"use client";

import { useRef, useState } from "react";
import { MoneyInput } from "~/components/budget/money-input";
import { IconPlus, IconX } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { categoryOf, LABEL_MAX, MAX_LINES, newLineId } from "~/lib/budget";
import type { BudgetLine, BudgetMode, BudgetPeriod } from "~/lib/types";

/**
 * A list of income sources or expenses. Simple mode changes amounts and can
 * add new lines; lines the person added can be named and removed there too.
 * Advanced mode can also rename and remove the built-in lines.
 */
export function BudgetLines({
  kind,
  lines,
  onChange,
  onInvalid,
  period,
  mode,
  sliderHint,
  showErrors = false,
  canAdd = mode === "advanced",
}: {
  kind: "income" | "expense";
  lines: BudgetLine[];
  onChange: (lines: BudgetLine[]) => void;
  /** Called when a line's amount becomes valid or invalid. */
  onInvalid: (id: string, invalid: boolean) => void;
  period: BudgetPeriod;
  mode: BudgetMode;
  sliderHint?: number;
  /** Show "needs a name" errors even on lines not touched yet. */
  showErrors?: boolean;
  /** Offer "Add" in simple mode too. */
  canAdd?: boolean;
}) {
  const [touched, setTouched] = useState<Set<string>>(new Set());
  // Lines added here can be named and removed even in simple mode.
  const [added, setAdded] = useState<Set<string>>(new Set());
  const nameRefs = useRef(new Map<string, HTMLInputElement>());
  const advanced = mode === "advanced";
  const noun = kind === "income" ? "income" : "expense";

  function update(id: string, patch: Partial<BudgetLine>) {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function remove(id: string) {
    onInvalid(id, false);
    onChange(lines.filter((l) => l.id !== id));
  }

  function add() {
    const id = newLineId();
    setAdded((prev) => new Set(prev).add(id));
    onChange([...lines, { id, label: "", amount: 0, category: "custom" }]);
    // Focus the new name box once it's on the page.
    setTimeout(() => nameRefs.current.get(id)?.focus(), 0);
  }

  return (
    <div className="flex flex-col gap-4">
      {lines.length === 0 && (
        <p className="text-lg text-muted-foreground">
          {kind === "income"
            ? "No income added yet."
            : "No expenses added yet."}
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {lines.map((line) => {
          const help = categoryOf(line.category)?.help;
          const nameMissing =
            !line.label.trim() && (showErrors || touched.has(line.id));
          const shownLabel = line.label.trim() || `New ${noun}`;
          // Expenses the person added themselves (not a built-in category)
          // can always be renamed or removed, even after the list redraws.
          const editable =
            advanced ||
            added.has(line.id) ||
            (canAdd && kind === "expense" && line.category === "custom");
          return (
            <li
              key={line.id}
              className="flex flex-col gap-3 rounded-xl border-2 border-border bg-card p-4"
            >
              {editable && (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor={`name-${line.id}`}
                    className="text-lg font-medium text-muted-foreground"
                  >
                    Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      id={`name-${line.id}`}
                      ref={(el) => {
                        if (el) nameRefs.current.set(line.id, el);
                        else nameRefs.current.delete(line.id);
                      }}
                      value={line.label}
                      maxLength={LABEL_MAX}
                      placeholder={
                        kind === "income" ? "e.g. Pension" : "e.g. Pet care"
                      }
                      aria-invalid={nameMissing || undefined}
                      aria-describedby={
                        nameMissing ? `name-error-${line.id}` : undefined
                      }
                      onChange={(e) =>
                        update(line.id, { label: e.target.value })
                      }
                      onBlur={() => setTouched((t) => new Set(t).add(line.id))}
                      className="h-14 min-w-0 flex-1 rounded-lg border-2 border-input bg-background px-3 text-xl outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/40 aria-invalid:border-destructive dark:bg-input/30"
                    />
                    <Button
                      type="button"
                      size="xl"
                      variant="outline"
                      onClick={() => remove(line.id)}
                      aria-label={`Remove ${shownLabel}`}
                      className="border-2 px-4"
                    >
                      <IconX />
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  </div>
                  {nameMissing && (
                    <p
                      id={`name-error-${line.id}`}
                      className="text-lg font-medium text-destructive"
                    >
                      Please give this {noun} a name.
                    </p>
                  )}
                </div>
              )}
              <MoneyInput
                key={`${line.id}-${period}`}
                label={editable ? `Amount for ${shownLabel}` : shownLabel}
                hideLabel={editable}
                help={editable ? undefined : help}
                value={line.amount}
                period={period}
                sliderHint={sliderHint}
                onChange={(amount) => {
                  onInvalid(line.id, amount === null);
                  if (amount !== null) update(line.id, { amount });
                }}
              />
            </li>
          );
        })}
      </ul>

      {canAdd &&
        (lines.length < MAX_LINES ? (
          <Button
            type="button"
            size="xl"
            variant="outline"
            onClick={add}
            className="w-full border-2 border-dashed sm:w-fit"
          >
            <IconPlus />
            {kind === "income" ? "Add an income source" : "Add an expense"}
          </Button>
        ) : (
          <p className="text-lg text-muted-foreground">
            You've reached the most lines a budget can have ({MAX_LINES}).
          </p>
        ))}
    </div>
  );
}
