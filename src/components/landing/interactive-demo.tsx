"use client";

import { useState } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

const choices = [
  {
    label: "Pay for the repair using savings",
    outcome:
      "Your repair is handled right away and you avoid interest charges — but your emergency savings drops, which could matter if another expense comes up soon.",
  },
  {
    label: "Put it on a credit card",
    outcome:
      "Your savings stay intact, but if the balance isn't paid off quickly, interest charges can make the repair cost more over time.",
  },
  {
    label: "Wait and skip the repair for now",
    outcome:
      "You save money today, but delaying car repairs can sometimes lead to bigger, more expensive problems later.",
  },
  {
    label: "Ask a family member for help",
    outcome:
      "This can ease the immediate cost, but it helps to talk openly about whether and how you'd pay them back.",
  },
];

export function InteractiveDemo() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Learn by making decisions, not just reading lessons.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            GoldenGuide uses realistic situations to help users understand
            financial decisions, instead of only giving textbook definitions.
          </p>
        </div>

        <Card className="mt-10 shadow-md">
          <CardContent className="flex flex-col gap-5">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="font-medium">
                You have $2,500 available this month. Your car needs a $900
                repair. What would you do?
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {choices.map((choice, i) => (
                <button
                  key={choice.label}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors",
                    selected === i
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {choice.label}
                </button>
              ))}
            </div>

            {selected !== null && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What could happen
                </p>
                <p className="mt-1 text-sm">{choices[selected]?.outcome}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
