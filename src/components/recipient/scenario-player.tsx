"use client";

import { useState } from "react";
import { IconArrowRight } from "~/components/icons";
import { ReadAloudButton } from "~/components/recipient/read-aloud-button";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { createClient } from "~/lib/supabase/client";
import type { Scenario } from "~/lib/types";
import { cn } from "~/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function ScenarioPlayer({
  scenarios,
  userId,
  emptyMessage = "New practice situations are on their way. Please check back soon.",
}: {
  scenarios: (Pick<Scenario, "id" | "title" | "prompt" | "choices"> & {
    /** Why this situation was picked for the learner. */
    reason?: string;
  })[];
  userId: string;
  emptyMessage?: string;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const scenario = scenarios[index];

  if (!scenario) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-xl">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  async function choose(choiceIndex: number) {
    if (!scenario) return;
    setSelected(choiceIndex);
    const supabase = createClient();
    await supabase.from("usage_events").insert({
      user_id: userId,
      kind: "scenario_attempt",
      ref_id: scenario.id,
    });
  }

  function nextScenario() {
    setIndex((index + 1) % scenarios.length);
    setSelected(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-6">
      {scenarios.length > 1 && (
        <p className="text-lg font-medium text-muted-foreground">
          Situation {index + 1} of {scenarios.length}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-xl border-2 border-border bg-muted/40 p-5">
        {scenario.reason && (
          <p className="text-lg font-medium text-muted-foreground">
            {scenario.reason}
          </p>
        )}
        <h2 className="text-2xl font-semibold">{scenario.title}</h2>
        <p className="text-xl leading-relaxed">{scenario.prompt}</p>
        {selected === null && (
          <ReadAloudButton
            text={`${scenario.title}. ${scenario.prompt} What would you do? ${scenario.choices
              .map((c, i) => `${LETTERS[i]}: ${c.label}.`)
              .join(" ")}`}
            className="w-fit bg-background"
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xl font-semibold">
          {selected === null ? "What would you do? Tap one." : "You chose:"}
        </p>
        {scenario.choices.map((choice, i) =>
          selected === null || selected === i ? (
            <button
              key={choice.label}
              type="button"
              onClick={() => choose(i)}
              disabled={selected !== null}
              className={cn(
                "flex min-h-16 items-center gap-4 rounded-xl border-2 px-4 py-3 text-left text-xl transition-colors",
                selected === i
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary hover:bg-accent",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-current text-lg font-bold">
                {LETTERS[i]}
              </span>
              <span>{choice.label}</span>
            </button>
          ) : null,
        )}
      </div>

      {selected !== null && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 p-5"
        >
          <p className="text-xl font-semibold">What could happen</p>
          <p className="text-xl leading-relaxed">
            {scenario.choices[selected]?.outcome}
          </p>
          <p className="text-lg text-muted-foreground">
            There is no single right answer. Every choice has good and bad
            sides.
          </p>
          <ReadAloudButton
            text={`What could happen. ${scenario.choices[selected]?.outcome ?? ""}`}
            className="mt-1 w-fit bg-background"
          />
        </div>
      )}

      {selected !== null && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="xl" variant="outline" onClick={() => setSelected(null)}>
            Try a different choice
          </Button>
          {scenarios.length > 1 && (
            <Button size="xl" onClick={nextScenario}>
              Next situation
              <IconArrowRight />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
