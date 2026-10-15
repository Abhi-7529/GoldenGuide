import { IconCheck, IconPiggyBank, IconShieldAlert } from "~/components/icons";
import {
  type BudgetTotals,
  budgetFeedback,
  formatMoney,
  perPeriod,
  savingsFeedback,
  toPeriod,
} from "~/lib/budget";
import type { BudgetPeriod } from "~/lib/types";
import { cn } from "~/lib/utils";

/** Money in, money out, and what's left, with plain-words feedback. */
export function BudgetSummary({
  totals,
  period,
  savingsGoal,
  compact = false,
}: {
  totals: BudgetTotals;
  period: BudgetPeriod;
  savingsGoal: number;
  /** Smaller text for caregiver screens. */
  compact?: boolean;
}) {
  const feedback = budgetFeedback(totals, period);
  const savings = savingsFeedback(totals, savingsGoal, period);
  // Compact is the caregiver's view of someone else's budget, so it describes
  // the numbers instead of speaking to "you".
  const per = perPeriod(period);
  const money = (n: number) => formatMoney(toPeriod(n, period));
  const title = !compact
    ? feedback.title
    : totals.remaining < 0
      ? `Spending ${money(-totals.remaining)} more than comes in`
      : totals.remaining === 0
        ? "Money in matches money out"
        : `${money(totals.remaining)} left over ${per}`;
  const savingsText =
    savings && compact
      ? `Saving ${money(totals.savings)} of a ${money(savingsGoal)} goal ${per}.`
      : savings?.message;
  const short = totals.remaining < 0;

  const tiles = [
    { label: "Money coming in", value: totals.income },
    { label: "Money going out", value: totals.expenses },
    {
      label: short ? "Short by" : "Left over",
      value: Math.abs(totals.remaining),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t, i) => (
          <div
            key={t.label}
            className={cn(
              "flex flex-col gap-1 rounded-xl border-2 bg-card p-4",
              i === 2 && short ? "border-destructive/60" : "border-border",
            )}
          >
            <dt className={compact ? "text-sm" : "text-lg"}>{t.label}</dt>
            <dd
              className={cn(
                "font-bold tabular-nums",
                compact ? "text-xl" : "text-3xl",
                i === 2 && short && "text-destructive",
              )}
            >
              {formatMoney(toPeriod(t.value, period))}
              <span
                className={cn(
                  "ml-1 font-normal text-muted-foreground",
                  compact ? "text-xs" : "text-base",
                )}
              >
                {per}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <div
        className={cn(
          "flex flex-col gap-2 rounded-xl border-2 p-4",
          short
            ? "border-destructive/50 bg-destructive/5"
            : "border-primary/40 bg-primary/5",
        )}
      >
        <p
          aria-live="polite"
          className={cn(
            "flex items-center gap-2 font-bold",
            compact ? "text-base" : "text-2xl",
          )}
        >
          {short ? (
            <IconShieldAlert className="size-7 shrink-0 text-destructive" />
          ) : (
            <IconCheck className="size-7 shrink-0" />
          )}
          {title}
        </p>
        {!compact && (
          <p className="text-xl leading-relaxed">{feedback.message}</p>
        )}
        {!compact && feedback.ideas.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold">
              Some things people often look at:
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-6 text-lg">
              {feedback.ideas.map((idea) => (
                <li key={idea}>{idea}</li>
              ))}
            </ul>
          </div>
        )}
        {savings && (
          <p
            className={cn(
              "flex items-start gap-2",
              compact ? "text-sm" : "text-xl",
            )}
          >
            <IconPiggyBank
              className={cn("mt-0.5 shrink-0", compact ? "size-5" : "size-7")}
            />
            {savingsText}
          </p>
        )}
      </div>
    </div>
  );
}
