"use client";

import { useId } from "react";
import { cn } from "~/lib/utils";

/**
 * A row of large buttons where one is chosen. Built on real radio inputs, so
 * arrow keys move between choices and screen readers announce the group.
 */
export function ChoiceGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  disabled = false,
  className,
}: {
  legend: string;
  options: { value: T; label: string; description?: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset
      disabled={disabled}
      className={cn("flex flex-col gap-2 disabled:opacity-60", className)}
    >
      <legend className="mb-2 text-xl font-semibold">{legend}</legend>
      <div
        className={cn(
          "grid gap-2",
          options.length === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {options.map((o) => (
          <label key={o.value} className="relative flex">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-14 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-3 py-2 text-center text-lg font-semibold transition-colors",
                "border-border bg-card hover:border-primary/60 hover:bg-accent",
                "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
                "peer-focus-visible:ring-4 peer-focus-visible:ring-ring/50",
              )}
            >
              {o.label}
              {o.description && (
                <span className="text-base font-normal">{o.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
