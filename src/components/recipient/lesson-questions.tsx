"use client";

import { useState } from "react";
import { IconArrowRight, IconCheck, IconX } from "~/components/icons";
import { ReadAloudButton } from "~/components/recipient/read-aloud-button";
import { Button } from "~/components/ui/button";
import type { PracticeQuestion } from "~/lib/types";
import { cn } from "~/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Shows practice questions one at a time with large answer buttons. */
export function LessonQuestions({
  questions,
  onFinish,
}: {
  questions: PracticeQuestion[];
  onFinish: (correctCount: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const question = questions[index];
  if (!question) return null;

  const answered = selected !== null;
  const isLast = index === questions.length - 1;
  const correctChoice = question.choices[question.correct_index];
  const feedback =
    selected === question.correct_index
      ? "Yes, that's right!"
      : `Not quite. The right answer is: ${correctChoice}`;

  function choose(choiceIndex: number) {
    if (answered || !question) return;
    setSelected(choiceIndex);
    if (choiceIndex === question.correct_index) {
      setCorrectCount((n) => n + 1);
    }
  }

  function next() {
    if (isLast) {
      onFinish(correctCount);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-lg font-medium text-muted-foreground">
        Question {index + 1} of {questions.length}
      </p>
      <h2 className="text-2xl font-semibold leading-snug">
        {question.question}
      </h2>
      {!answered && (
        <ReadAloudButton
          text={`${question.question} ${question.choices
            .map((c, i) => `${LETTERS[i]}: ${c}.`)
            .join(" ")}`}
          label="Listen to the question"
          className="w-fit"
        />
      )}

      {!answered && (
        <p className="text-lg">Tap the answer you think is right.</p>
      )}

      <div className="flex flex-col gap-3">
        {question.choices.map((choice, i) => {
          const isCorrect = i === question.correct_index;
          const isSelected = selected === i;
          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: choices are static
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={answered}
              className={cn(
                "flex min-h-16 items-center gap-4 rounded-xl border-2 px-4 py-3 text-left text-xl transition-colors",
                !answered &&
                  "border-border bg-card hover:border-primary hover:bg-accent",
                answered && isCorrect && "border-primary bg-primary/10",
                answered &&
                  isSelected &&
                  !isCorrect &&
                  "border-destructive bg-destructive/5",
                answered &&
                  !isCorrect &&
                  !isSelected &&
                  "border-border opacity-60",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold",
                  answered && isCorrect
                    ? "border-primary bg-primary text-primary-foreground"
                    : answered && isSelected
                      ? "border-destructive bg-destructive text-white dark:bg-destructive/60"
                      : "border-border",
                )}
              >
                {answered && isCorrect ? (
                  <IconCheck className="size-6" />
                ) : answered && isSelected ? (
                  <IconX className="size-6" />
                ) : (
                  LETTERS[i]
                )}
              </span>
              <span>{choice}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 p-5"
        >
          <p className="text-xl font-semibold">{feedback}</p>
          {question.explanation && (
            <p className="text-lg">{question.explanation}</p>
          )}
          <ReadAloudButton
            text={`${feedback} ${question.explanation}`}
            className="mt-1 w-fit bg-background"
          />
        </div>
      )}

      {answered && (
        <Button size="xl" onClick={next} className="w-full sm:w-fit">
          {isLast ? "See how I did" : "Next question"}
          <IconArrowRight />
        </Button>
      )}
    </div>
  );
}
