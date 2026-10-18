"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconArrowRight, IconCheck, IconShieldAlert } from "~/components/icons";
import { ReadAloudButton } from "~/components/recipient/read-aloud-button";
import { SimulationFrame } from "~/components/simulation-frame";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { channelLabel, levelLabel } from "~/lib/simulations";
import { createClient } from "~/lib/supabase/client";
import type { ScamSimulation } from "~/lib/types";
import { cn } from "~/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * One pretend scam at a time: the learner picks what they'd do, then sees
 * whether it was safe, the safest action, and the warning signs.
 */
export function SimulationPlayer({
  simulations,
  userId,
  startIndex = 0,
  emptyMessage = "There are no practices here yet. Please check back soon.",
}: {
  simulations: (ScamSimulation & { reason?: string })[];
  userId: string;
  startIndex?: number;
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(startIndex);
  const [selected, setSelected] = useState<number | null>(null);
  // The list can grow after a refresh (a new level opens), so the index keeps
  // counting up and wraps here instead of in next(): newly opened practices
  // come next rather than starting over.
  const position = simulations.length ? index % simulations.length : 0;
  const simulation = simulations[position];

  if (!simulation) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-xl">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  const choice = selected === null ? null : simulation.choices[selected];
  const safeChoice = simulation.choices.find((c) => c.safe);

  async function choose(choiceIndex: number) {
    if (!simulation) return;
    setSelected(choiceIndex);
    // The database grades the answer; saving is best-effort.
    const supabase = createClient();
    await supabase.from("scam_simulation_attempts").insert({
      user_id: userId,
      simulation_id: simulation.id,
      choice_index: choiceIndex,
    });
  }

  function next() {
    setIndex(position + 1);
    setSelected(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Refresh progress and level unlocks.
    router.refresh();
  }

  const situationSpeech = [
    simulation.situation,
    `${channelLabel(simulation.channel)} from ${simulation.sender || "someone you don't know"}.`,
    simulation.subject ? `Subject: ${simulation.subject}.` : "",
    simulation.body,
    "What would you do?",
    ...simulation.choices.map((c, i) => `${LETTERS[i]}: ${c.label}.`),
  ]
    .filter(Boolean)
    .join(" ");

  const feedbackSpeech = choice
    ? [
        choice.safe ? "That's a safe choice." : "That choice is risky.",
        choice.feedback,
        `The safest thing to do: ${simulation.safest_action}`,
        simulation.warning_signs.length
          ? `Warning signs: ${simulation.warning_signs.join(". ")}.`
          : "",
      ].join(" ")
    : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {simulations.length > 1 && (
          <p className="mr-2 text-lg font-medium text-muted-foreground">
            Practice {position + 1} of {simulations.length}
          </p>
        )}
        <Badge variant="outline" className="text-base">
          {channelLabel(simulation.channel)}
        </Badge>
        <Badge variant="outline" className="text-base">
          {levelLabel(simulation.level)}
        </Badge>
      </div>

      <div className="flex flex-col gap-3">
        {simulation.reason && (
          <p className="text-lg font-medium text-muted-foreground">
            {simulation.reason}
          </p>
        )}
        <h2 className="text-2xl font-semibold">{simulation.title}</h2>
        {simulation.situation && (
          <p className="text-xl leading-relaxed">{simulation.situation}</p>
        )}
      </div>

      <SimulationFrame simulation={simulation} />

      {selected === null && (
        <ReadAloudButton text={situationSpeech} className="w-fit" />
      )}

      <div className="flex flex-col gap-3">
        <p className="text-xl font-semibold">
          {selected === null ? "What would you do? Tap one." : "You chose:"}
        </p>
        {simulation.choices.map((c, i) =>
          selected === null || selected === i ? (
            <button
              key={c.label}
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
              <span>{c.label}</span>
            </button>
          ) : null,
        )}
      </div>

      {choice && (
        <div role="status" className="flex flex-col gap-4">
          <div
            className={cn(
              "flex flex-col gap-2 rounded-xl border-2 p-5",
              choice.safe
                ? "border-primary/40 bg-primary/5"
                : "border-destructive/50 bg-destructive/5",
            )}
          >
            <p className="flex items-center gap-2 text-2xl font-bold">
              {choice.safe ? (
                <IconCheck className="size-7 shrink-0 text-primary-strong" />
              ) : (
                <IconShieldAlert className="size-7 shrink-0 text-destructive" />
              )}
              {choice.safe ? "That's a safe choice!" : "That choice is risky."}
            </p>
            <p className="text-xl leading-relaxed">{choice.feedback}</p>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border-2 border-border bg-card p-5">
            <p className="text-xl font-semibold">The safest thing to do</p>
            <p className="text-xl leading-relaxed">
              {simulation.safest_action}
            </p>
            {!choice.safe && safeChoice && (
              <p className="text-lg text-muted-foreground">
                The safe choice was: “{safeChoice.label}”
              </p>
            )}
          </div>

          {simulation.warning_signs.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border-2 border-amber-500/60 bg-amber-50 p-5 text-amber-950 dark:border-amber-400/60 dark:bg-amber-950/60 dark:text-amber-50">
              <p className="text-xl font-semibold">
                Warning signs in this{" "}
                {channelLabel(simulation.channel).toLowerCase()}
              </p>
              <ul className="flex flex-col gap-2">
                {simulation.warning_signs.map((sign) => (
                  <li key={sign} className="flex gap-3 text-xl leading-relaxed">
                    <IconShieldAlert className="mt-1 size-6 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>{sign}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ReadAloudButton text={feedbackSpeech} className="w-fit" />
        </div>
      )}

      {selected !== null && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="xl" variant="outline" onClick={() => setSelected(null)}>
            Try a different choice
          </Button>
          {simulations.length > 1 && (
            <Button size="xl" onClick={next}>
              Next practice
              <IconArrowRight />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
