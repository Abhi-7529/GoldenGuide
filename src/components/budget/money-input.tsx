"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  formatMoney,
  fromPeriod,
  MAX_AMOUNT,
  moneyText,
  niceCeil,
  parseMoney,
  perPeriod,
  sliderStep,
  toPeriod,
} from "~/lib/budget";
import type { BudgetPeriod } from "~/lib/types";
import { cn } from "~/lib/utils";

// A larger thumb and track than the browser default, so the slider is easy to
// grab with a finger or a shaky hand.
const sliderClass = cn(
  "h-10 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none",
  "[&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted-foreground/30",
  "[&::-webkit-slider-thumb]:-mt-2.5 [&::-webkit-slider-thumb]:size-8 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md",
  "focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-ring/60",
  "[&::-moz-range-track]:h-3 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted-foreground/30",
  "[&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary",
  "focus-visible:[&::-moz-range-thumb]:ring-4 focus-visible:[&::-moz-range-thumb]:ring-ring/60",
);

/** Where a slider tops out before any amount is typed, per period. */
const SLIDER_BASE: Record<BudgetPeriod, number> = {
  weekly: 250,
  monthly: 1000,
  yearly: 12000,
};

/**
 * A dollar amount with a big typing box and an optional slider. The value is
 * monthly; it's shown and typed in the chosen period. Reports `null` while
 * the typed text isn't a valid amount, so the budget can't be saved with it.
 * Remount (change `key`) when the period changes.
 */
export function MoneyInput({
  label,
  hideLabel = false,
  help,
  value,
  period,
  onChange,
  slider = true,
  sliderHint = 0,
}: {
  label: string;
  hideLabel?: boolean;
  help?: string;
  /** Monthly dollars. */
  value: number;
  period: BudgetPeriod;
  onChange: (monthly: number | null) => void;
  slider?: boolean;
  /** A typical top amount for the slider, in monthly dollars (e.g. income). */
  sliderHint?: number;
}) {
  const id = useId();
  const shown = toPeriod(value, period);
  const [text, setText] = useState(moneyText(shown));
  const [error, setError] = useState<string | null>(null);
  const [max, setMax] = useState(() =>
    niceCeil(
      Math.max(shown * 2, toPeriod(sliderHint, period), SLIDER_BASE[period]),
    ),
  );
  const focused = useRef(false);

  // Follow changes made elsewhere (the slider, Undo, a challenge) unless the
  // person is typing in this box.
  useEffect(() => {
    if (focused.current) return;
    setText(moneyText(toPeriod(value, period)));
    setError(null);
  }, [value, period]);

  useEffect(() => {
    if (shown > max) setMax(niceCeil(shown * 1.25));
  }, [shown, max]);

  function type(next: string) {
    setText(next);
    const parsed = parseMoney(next);
    if (!parsed.ok) {
      setError(parsed.error);
      onChange(null);
      return;
    }
    const monthly = fromPeriod(parsed.value, period);
    if (monthly > MAX_AMOUNT) {
      setError(
        "That's more than this practice tool can hold. Please use a smaller number.",
      );
      onChange(null);
      return;
    }
    setError(null);
    onChange(monthly);
  }

  const describedBy = [help && `${id}-help`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className={cn("flex flex-col gap-1", hideLabel && "sr-only")}>
          <label htmlFor={id} className="text-xl font-semibold">
            {label}
          </label>
          {help && (
            <p id={`${id}-help`} className="text-lg text-muted-foreground">
              {help}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-44">
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-2xl text-muted-foreground"
            >
              $
            </span>
            <input
              id={id}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={text}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy || undefined}
              onFocus={() => {
                focused.current = true;
              }}
              onBlur={() => {
                focused.current = false;
                if (!error) setText(moneyText(toPeriod(value, period)));
              }}
              onChange={(e) => type(e.target.value)}
              className={cn(
                "h-14 w-full rounded-lg border-2 border-input bg-background pr-3 pl-9 text-2xl font-semibold tabular-nums outline-none dark:bg-input/30",
                "focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/40",
                error && "border-destructive",
              )}
            />
          </div>
          <span className="shrink-0 text-lg text-muted-foreground">
            {perPeriod(period)}
          </span>
        </div>
      </div>

      {slider && (
        <input
          type="range"
          min={0}
          max={max}
          step={sliderStep(period)}
          value={Math.min(shown, max)}
          aria-label={`${label}: slide to change the amount`}
          aria-valuetext={`${formatMoney(shown)} ${perPeriod(period)}`}
          onChange={(e) => {
            const next = Number(e.target.value);
            setText(moneyText(next));
            setError(null);
            onChange(fromPeriod(next, period));
          }}
          className={sliderClass}
        />
      )}

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-lg font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
