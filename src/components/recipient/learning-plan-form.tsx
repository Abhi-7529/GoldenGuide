"use client";

import { useState } from "react";
import { IconArrowLeft, IconArrowRight, IconCheck } from "~/components/icons";
import { Button } from "~/components/ui/button";
import {
  GOALS,
  type GoalId,
  LEVELS,
  TOPICS,
  type TopicId,
} from "~/lib/learning-plan";
import { createClient } from "~/lib/supabase/client";
import type { LessonLevel } from "~/lib/types";
import { cn } from "~/lib/utils";

type Step = "topics" | "level" | "goals";

export type PlanAnswers = {
  topics: TopicId[];
  level: LessonLevel;
  goals: GoalId[];
};

/** Saves answers as the user's learning preferences. Returns an error message. */
export async function savePlan(
  userId: string,
  mode: "learner" | "caregiver",
  answers: PlanAnswers,
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("learning_preferences")
    .upsert(
      mode === "learner"
        ? { user_id: userId, ...answers }
        : { user_id: userId, topics: answers.topics },
    );
  return error ? "Sorry, we couldn't save that. Please try again." : null;
}

/**
 * Asks one question at a time. Caregivers only answer the topics question:
 * those become suggestions for the learner once they connect, and the learner
 * decides whether to add them.
 */
export function LearningPlanForm({
  mode,
  initial,
  startAtEnd = false,
  saveLabel = "Save my plan",
  onSubmit,
  onBack,
  onSkip,
}: {
  mode: "learner" | "caregiver";
  initial?: PlanAnswers | null;
  /** Open on the last question, e.g. when coming back from a later step. */
  startAtEnd?: boolean;
  saveLabel?: string;
  /** Called with the answers; returns an error message to show, if any. */
  onSubmit: (answers: PlanAnswers) => Promise<string | null>;
  /** Shows Back on the first question; gets the answers so far. */
  onBack?: (answers: PlanAnswers) => void;
  onSkip?: () => void;
}) {
  const steps: Step[] =
    mode === "learner" ? ["topics", "level", "goals"] : ["topics"];
  const [stepIndex, setStepIndex] = useState(startAtEnd ? steps.length - 1 : 0);
  const [topics, setTopics] = useState<TopicId[]>(initial?.topics ?? []);
  const [level, setLevel] = useState<LessonLevel>(initial?.level ?? "beginner");
  const [goals, setGoals] = useState<GoalId[]>(initial?.goals ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = steps[stepIndex] ?? "topics";
  const isLast = stepIndex === steps.length - 1;

  function toggle<T>(list: T[], value: T) {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  async function save() {
    setSaving(true);
    setError(null);
    const message = await onSubmit({ topics, level, goals });
    setSaving(false);
    setError(message);
  }

  function next() {
    if (isLast) {
      void save();
      return;
    }
    setStepIndex(stepIndex + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError(null);
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    } else {
      onBack?.({ topics, level, goals });
    }
  }

  return (
    <div className="flex flex-col gap-6 text-lg">
      {steps.length > 1 && (
        <p className="text-lg font-medium text-muted-foreground">
          Question {stepIndex + 1} of {steps.length}
        </p>
      )}

      {step === "topics" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 flex flex-col gap-2">
            <span className="text-2xl font-semibold">
              {mode === "learner"
                ? "Which money topics would you like to learn about?"
                : "Which topics would you like them to focus on?"}
            </span>
            <span className="text-lg text-muted-foreground">
              {mode === "learner"
                ? "Tap as many as you like. You can change these later."
                : "We'll suggest these to them when they connect. They choose what to add to their plan."}
            </span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {TOPICS.map((t) => (
              <ChoiceButton
                key={t.id}
                selected={topics.includes(t.id)}
                onClick={() => setTopics(toggle(topics, t.id))}
                title={t.label}
                description={t.description}
              />
            ))}
          </div>
        </fieldset>
      )}

      {step === "level" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 flex flex-col gap-2">
            <span className="text-2xl font-semibold">
              How much do you know about money matters?
            </span>
            <span className="text-lg text-muted-foreground">
              Pick the one that fits best. There's no wrong answer.
            </span>
          </legend>
          <div className="flex flex-col gap-3">
            {LEVELS.map((l) => (
              <ChoiceButton
                key={l.id}
                selected={level === l.id}
                onClick={() => setLevel(l.id)}
                title={l.choice}
                description={l.description}
              />
            ))}
          </div>
        </fieldset>
      )}

      {step === "goals" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 flex flex-col gap-2">
            <span className="text-2xl font-semibold">
              What would you like to get out of GoldenGuide?
            </span>
            <span className="text-lg text-muted-foreground">
              Tap as many as you like.
            </span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {GOALS.map((g) => (
              <ChoiceButton
                key={g.id}
                selected={goals.includes(g.id)}
                onClick={() => setGoals(toggle(goals, g.id))}
                title={g.label}
              />
            ))}
          </div>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="text-lg text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {(stepIndex > 0 || onBack) && (
          <Button size="xl" variant="outline" disabled={saving} onClick={back}>
            <IconArrowLeft />
            Back
          </Button>
        )}
        <Button size="xl" disabled={saving} onClick={next}>
          {saving ? "Saving..." : isLast ? saveLabel : "Next"}
          {!saving && !isLast && <IconArrowRight />}
        </Button>
        {onSkip && (
          <Button size="xl" variant="ghost" disabled={saving} onClick={onSkip}>
            Skip for now
          </Button>
        )}
      </div>
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-16 items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border-2",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border",
        )}
      >
        {selected && <IconCheck className="size-5" />}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-xl font-semibold">{title}</span>
        {description && (
          <span className="text-base text-muted-foreground">{description}</span>
        )}
      </span>
    </button>
  );
}
