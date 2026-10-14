"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBook,
  IconCheck,
  IconShieldCheck,
} from "~/components/icons";
import { LessonQuestions } from "~/components/recipient/lesson-questions";
import { ReadAloudButton } from "~/components/recipient/read-aloud-button";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { createClient } from "~/lib/supabase/client";
import type { Lesson } from "~/lib/types";
import { cn } from "~/lib/utils";

// Lesson text is split into small pages so learners only see a little at a time.
const PARAGRAPHS_PER_PAGE = 2;

type Step =
  | { kind: "read"; paragraphs: string[]; isFirst: boolean }
  | { kind: "examples" }
  | { kind: "takeaways" }
  | { kind: "quiz" }
  | { kind: "done" };

function buildSteps(lesson: Lesson): Step[] {
  const paragraphs = lesson.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const steps: Step[] = [];
  if (paragraphs.length === 0) {
    steps.push({ kind: "read", paragraphs: [], isFirst: true });
  }
  for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
    steps.push({
      kind: "read",
      paragraphs: paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE),
      isFirst: i === 0,
    });
  }
  if (lesson.examples.length > 0) steps.push({ kind: "examples" });
  if (lesson.key_takeaways.length > 0) steps.push({ kind: "takeaways" });
  if (lesson.practice_questions.length > 0) steps.push({ kind: "quiz" });
  steps.push({ kind: "done" });
  return steps;
}

type FinishMessage = {
  heading: string;
  message: string;
  /** Low scores lead with "Read it again" instead of leaving the lesson. */
  suggestReread: boolean;
};

// Kind, encouraging wording for the finish screen, based on the quiz score.
function finishMessage(score: number | null, total: number): FinishMessage {
  if (score === null || total === 0) {
    return { heading: "Well done!", message: "", suggestReread: false };
  }
  const result = `You got ${score} out of ${total} questions right.`;
  if (score === total) {
    return {
      heading: "Excellent work!",
      message: `${result} You really understood this lesson.`,
      suggestReread: false,
    };
  }
  if (score / total >= 0.6) {
    return {
      heading: "Good job!",
      message: `${result} You're almost there. Reading it again can help with the ones you missed.`,
      suggestReread: false,
    };
  }
  if (score > 0) {
    return {
      heading: "Nice try!",
      message: `${result} These ideas can take a little time. Reading the lesson again will help. There's no rush.`,
      suggestReread: true,
    };
  }
  return {
    heading: "Thanks for trying!",
    message: `You didn't get any questions right this time, and that's okay. These ideas are new for many people. Let's read the lesson again together. Take your time.`,
    suggestReread: true,
  };
}

/** The words the Listen button reads for each step. */
function speechFor(step: Step, lesson: Lesson, finish: FinishMessage) {
  switch (step.kind) {
    case "read":
      return [
        step.isFirst ? lesson.title : "",
        step.isFirst ? lesson.summary : "",
        ...step.paragraphs,
      ]
        .filter(Boolean)
        .join(". ");
    case "examples":
      return [
        "Real-life examples.",
        ...lesson.examples.map((e) => `${e.title}. ${e.description}`),
      ].join(" ");
    case "takeaways":
      return ["Things to remember.", ...lesson.key_takeaways].join(" ");
    case "done":
      return [finish.heading, `You finished ${lesson.title}.`, finish.message]
        .filter(Boolean)
        .join(" ");
    default:
      return "";
  }
}

/**
 * A lesson as learners see it, one step at a time with large Back and Next
 * buttons. Shared by the learner page and the admin preview. When
 * `progressUserId` is set, finishing the lesson records it for My Progress.
 */
export function LessonContent({
  lesson,
  exitHref,
  exitLabel,
  progressUserId,
  practiceHref,
}: {
  lesson: Lesson;
  exitHref: string;
  exitLabel: string;
  progressUserId?: string;
  /** Scam Practice that goes with this lesson, offered when it's finished. */
  practiceHref?: string;
}) {
  const steps = buildSteps(lesson);
  const [stepIndex, setStepIndex] = useState(0);
  const [score, setScore] = useState<number | null>(null);

  const step = steps[stepIndex] ?? steps[0];
  // The final "done" screen isn't counted as a step.
  const totalSteps = steps.length - 1;
  const isDone = step.kind === "done";
  const finish = finishMessage(score, lesson.practice_questions.length);

  function goTo(index: number) {
    setStepIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (steps[index]?.kind === "done") {
      void recordCompletion(score ?? 0);
    }
  }

  async function recordCompletion(correctCount: number) {
    if (!progressUserId) return;
    const supabase = createClient();
    // Saving progress is best-effort; the learner still sees "Well done!".
    await supabase.from("lesson_completions").insert({
      user_id: progressUserId,
      lesson_id: lesson.id,
      correct_count: correctCount,
      question_count: lesson.practice_questions.length,
    });
  }

  const nextLabel =
    steps[stepIndex + 1]?.kind === "quiz"
      ? "Start the questions"
      : steps[stepIndex + 1]?.kind === "done"
        ? "Finish"
        : "Next";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={exitHref}
        className="flex w-fit items-center gap-2 text-lg font-medium text-primary underline-offset-4 hover:underline"
      >
        <IconArrowLeft className="size-5" />
        {exitLabel}
      </Link>

      {!isDone && (
        <div className="flex flex-col gap-2">
          <p className="text-lg font-medium text-muted-foreground">
            Step {stepIndex + 1} of {totalSteps}
          </p>
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Lesson progress"
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-valuenow={stepIndex + 1}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {step.kind !== "quiz" && (
        <ReadAloudButton
          text={speechFor(step, lesson, finish)}
          label={isDone ? "Listen" : "Listen to this page"}
          className="w-fit"
        />
      )}

      {step.kind === "read" && (
        <div className="flex flex-col gap-5">
          {step.isFirst ? (
            <>
              <h1 className="text-3xl font-bold leading-tight tracking-tight">
                {lesson.title}
              </h1>
              {lesson.summary && (
                <p className="text-xl font-medium">{lesson.summary}</p>
              )}
            </>
          ) : (
            <p className="text-xl font-semibold">{lesson.title}</p>
          )}
          {step.paragraphs.length > 0 ? (
            step.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="whitespace-pre-line text-xl leading-relaxed"
              >
                {paragraph}
              </p>
            ))
          ) : (
            <p className="text-xl">This lesson's content is coming soon.</p>
          )}
        </div>
      )}

      {step.kind === "examples" && (
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold tracking-tight">
            Real-life examples
          </h2>
          {lesson.examples.map((example) => (
            <Card key={example.title} className="border-2">
              <CardContent className="flex flex-col gap-2">
                <p className="text-xl font-semibold">{example.title}</p>
                <p className="text-xl leading-relaxed">{example.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {step.kind === "takeaways" && (
        <div className="flex flex-col gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Things to remember
          </h2>
          <ul className="flex flex-col gap-4">
            {lesson.key_takeaways.map((takeaway) => (
              <li key={takeaway} className="flex gap-3 text-xl leading-relaxed">
                <IconCheck className="mt-1 size-6 shrink-0 text-primary" />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step.kind === "quiz" && (
        <LessonQuestions
          questions={lesson.practice_questions}
          onFinish={(correct) => {
            setScore(correct);
            setStepIndex(stepIndex + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
            void recordCompletion(correct);
          }}
        />
      )}

      {step.kind === "done" && (
        <div className="flex flex-col items-center gap-5 rounded-xl border-2 border-primary/30 bg-primary/5 p-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {finish.suggestReread ? (
              <IconBook className="size-9" />
            ) : (
              <IconCheck className="size-9" />
            )}
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            {finish.heading}
          </h2>
          <p className="text-xl">You finished “{lesson.title}”.</p>
          {finish.message && <p className="text-xl">{finish.message}</p>}
          <div
            className={cn(
              "flex w-full flex-col gap-3 sm:w-auto sm:flex-row",
              finish.suggestReread && "flex-col-reverse sm:flex-row-reverse",
            )}
          >
            <Button
              asChild
              size="xl"
              variant={finish.suggestReread ? "outline" : "default"}
            >
              <Link href={exitHref}>{exitLabel}</Link>
            </Button>
            <Button
              size="xl"
              variant={finish.suggestReread ? "default" : "outline"}
              onClick={() => {
                setScore(null);
                goTo(0);
              }}
            >
              Read it again
            </Button>
          </div>
          {practiceHref && (
            <div className="flex flex-col items-center gap-3 border-t border-primary/20 pt-5">
              <p className="text-xl">
                Ready to try what you learned on a pretend scam?
              </p>
              <Button asChild size="xl" variant="outline">
                <Link href={practiceHref}>
                  <IconShieldCheck />
                  Practice spotting this scam
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {!isDone && step.kind !== "quiz" && (
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
          {stepIndex > 0 ? (
            <Button
              size="xl"
              variant="outline"
              onClick={() => goTo(stepIndex - 1)}
            >
              <IconArrowLeft />
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button size="xl" onClick={() => goTo(stepIndex + 1)}>
            {nextLabel}
            <IconArrowRight />
          </Button>
        </div>
      )}

      {step.kind === "quiz" && (
        <div className="border-t border-border pt-6">
          <Button
            size="xl"
            variant="outline"
            onClick={() => goTo(stepIndex - 1)}
            className="w-full sm:w-fit"
          >
            <IconArrowLeft />
            Back to the lesson
          </Button>
        </div>
      )}

      <p className="text-base text-muted-foreground">
        GoldenGuide lessons are for learning only. They are not advice about
        your own money. For decisions about your money, talk with someone you
        trust or a qualified professional.
      </p>
    </div>
  );
}
