import {
  type BudgetTotals,
  formatMoney,
  KIND_LABELS,
  kindOf,
  perPeriod,
  toPeriod,
} from "~/lib/budget";
import type { BudgetLine, BudgetPeriod } from "~/lib/types";
import { cn } from "~/lib/utils";

function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/**
 * Where the money goes: one bar per expense, biggest first. Every bar is
 * labeled with its name, amount and share, so nothing depends on color.
 */
export function BudgetBreakdown({
  expenses,
  totals,
  period,
  showKinds = false,
  compact = false,
}: {
  expenses: BudgetLine[];
  totals: BudgetTotals;
  period: BudgetPeriod;
  /** Also show the needs / wants / saving split. */
  showKinds?: boolean;
  compact?: boolean;
}) {
  const lines = expenses
    .filter((l) => l.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  // Shares are of income when there is some, so "35%" reads as "35% of what
  // comes in". Bars share one scale so they can be compared.
  const shareOf = totals.income > 0 ? totals.income : totals.expenses;
  const scale = Math.max(totals.income, totals.expenses, 1);
  const textSize = compact ? "text-sm" : "text-lg";

  if (lines.length === 0) {
    return (
      <p className={cn(textSize, "text-muted-foreground")}>
        Add some expenses to see where your money goes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ul
        aria-label="Expenses from biggest to smallest"
        className="flex flex-col gap-3"
      >
        {lines.map((l) => {
          const share = percent(l.amount, shareOf);
          const amount = formatMoney(toPeriod(l.amount, period));
          return (
            <li key={l.id} className="flex flex-col gap-1">
              <div
                className={cn(
                  "flex flex-wrap items-baseline justify-between gap-x-3",
                  textSize,
                )}
              >
                <span className="font-semibold">{l.label}</span>
                <span className="tabular-nums">
                  {amount}
                  <span className="text-muted-foreground">
                    {" "}
                    · {share}%{totals.income > 0 ? " of income" : ""}
                  </span>
                </span>
              </div>
              <div
                aria-hidden
                title={`${l.label}: ${amount} ${perPeriod(period)}`}
                className={cn(
                  "w-full overflow-hidden rounded-r-[4px] bg-muted",
                  compact ? "h-2.5" : "h-4",
                )}
              >
                <div
                  className="h-full rounded-r-[4px] bg-primary ring-1 ring-foreground/30 ring-inset"
                  style={{ width: `${Math.max(1, (l.amount / scale) * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {totals.income > 0 && totals.remaining > 0 && (
        <p className={textSize}>
          <span className="font-semibold">Not planned yet: </span>
          {formatMoney(toPeriod(totals.remaining, period))} ·{" "}
          {percent(totals.remaining, totals.income)}% of income
        </p>
      )}

      {showKinds && totals.income > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border-2 border-border p-4">
          <p className={cn(textSize, "font-semibold")}>
            Needs, wants, and saving
          </p>
          <dl className="grid gap-2 sm:grid-cols-3">
            {(["need", "want", "saving"] as const).map((kind) => {
              const value = expenses
                .filter((l) => kindOf(l) === kind)
                .reduce((t, l) => t + l.amount, 0);
              return (
                <div key={kind}>
                  <dt className="text-base text-muted-foreground">
                    {KIND_LABELS[kind]}
                  </dt>
                  <dd className="text-xl font-semibold tabular-nums">
                    {percent(value, totals.income)}% of income
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="text-base text-muted-foreground">
            {compact ? "Lines they added" : "Things you add yourself"} count as
            wants. A common guide is about 50% needs, 30% wants, and 20% saving,
            but every situation is different.
          </p>
        </div>
      )}
    </div>
  );
}
