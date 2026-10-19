import type * as React from "react";
import { IconCheck } from "~/components/icons";
import {
  BrowserFrame,
  BudgetPreview,
  LessonPreview,
  ProgressPreview,
  ScamPreview,
} from "~/components/landing/previews";
import { cn } from "~/lib/utils";

type Feature = {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  preview: React.ReactNode;
  previewLabel: string;
  /** Background tint behind the preview. */
  tint: string;
};

const features: Feature[] = [
  {
    eyebrow: "Personalized lessons",
    title: "Lessons that fit your goals and experience",
    body: "Short lessons on budgeting, bills, savings, credit and more, chosen for the topics you care about and the level you're comfortable with.",
    points: [
      "One small step per page",
      "Listen button reads every page aloud",
      "Picks up where you left off",
    ],
    preview: <LessonPreview />,
    previewLabel: "Preview of a GoldenGuide lesson page with a Listen button",
    tint: "bg-tile-amber",
  },
  {
    eyebrow: "Scam Practice",
    title: "Practice spotting scams, with zero risk",
    body: "Pretend texts, emails, phone calls and websites based on real tricks. Choose what you'd do and learn the warning signs, safely.",
    points: [
      "Clearly marked as practice. Nothing is real",
      "Kind, clear feedback on every choice",
      "Beginner to advanced levels",
    ],
    preview: <ScamPreview />,
    previewLabel:
      "Preview of a pretend scam text message in Scam Practice, with the safe choice selected",
    tint: "bg-tile-teal",
  },
  {
    eyebrow: "Budgeting tools",
    title: "See where your money goes",
    body: "Practice with a made-up budget, or plan your own money with simple, guided steps. No bank accounts or card numbers needed.",
    points: [
      "Ready-made examples for retirement and fixed incomes",
      "Weekly, monthly or yearly views",
      "Your budgets stay private unless you share them",
    ],
    preview: <BudgetPreview />,
    previewLabel:
      "Preview of a practice budget showing money in, money out and money left over",
    tint: "bg-tile-green",
  },
  {
    eyebrow: "Progress tracking",
    title: "Celebrate every step forward",
    body: "See the lessons you've finished, how you did on the questions, and your scam practice level as it grows over time.",
    points: [
      "Quiz results for every lesson",
      "Gentle suggestions for what to try next",
      "Read any lesson again whenever you like",
    ],
    preview: <ProgressPreview />,
    previewLabel:
      "Preview of the My Progress page with finished lessons and scam practice level",
    tint: "bg-tile-violet",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-y border-border bg-card/60 px-6 py-20 sm:py-24"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-20">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
          <p className="text-sm font-semibold tracking-widest text-primary-strong uppercase">
            What&apos;s inside
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to feel confident with money
          </h2>
        </div>

        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
          >
            <div
              className={cn(
                "flex flex-col gap-4",
                index % 2 === 1 && "lg:order-2",
              )}
            >
              <p className="text-sm font-semibold tracking-widest text-primary-strong uppercase">
                {feature.eyebrow}
              </p>
              <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {feature.title}
              </h3>
              <p className="text-lg text-muted-foreground">{feature.body}</p>
              <ul className="flex flex-col gap-2.5">
                {feature.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-lg">
                    <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <IconCheck className="size-3.5" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={cn(
                "rounded-3xl p-5 sm:p-8",
                feature.tint,
                index % 2 === 1 && "lg:order-1",
              )}
            >
              <BrowserFrame
                label={feature.previewLabel}
                className="mx-auto max-w-md transition-transform duration-300 motion-safe:hover:-translate-y-1"
              >
                {feature.preview}
              </BrowserFrame>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
