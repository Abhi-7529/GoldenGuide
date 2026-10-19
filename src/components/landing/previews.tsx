import type * as React from "react";
import {
  IconArrowRight,
  IconBook,
  IconCheck,
  IconHome,
  IconShieldCheck,
  IconTarget,
  IconTrendingUp,
  IconVolume,
} from "~/components/icons";
import { cn } from "~/lib/utils";

// Small, static pictures of real GoldenGuide screens for the landing page.
// They reuse the app's own colors and shapes, with made-up example data.

/** A simple browser window around a preview. */
export function BrowserFrame({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  /** Describes the picture for screen readers. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-20px_oklch(0.3_0.05_80/0.35)]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-4 py-2.5"
      >
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ml-3 h-5 flex-1 rounded-full bg-background/80" />
      </div>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

function Tile({
  tone,
  value,
  label,
  icon: Icon,
}: {
  tone: "teal" | "amber" | "green";
  value: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  const tones = {
    teal: "bg-tile-teal text-tile-teal-foreground",
    amber: "bg-tile-amber text-tile-amber-foreground",
    green: "bg-tile-green text-tile-green-foreground",
  };
  return (
    <div className={cn("flex flex-col gap-2 rounded-xl p-3", tones[tone])}>
      <span className="flex size-7 items-center justify-center rounded-full bg-card/70">
        <Icon className="size-4" />
      </span>
      <span className="font-heading text-xl font-bold text-foreground">
        {value}
      </span>
      <span className="text-xs text-foreground/75">{label}</span>
    </div>
  );
}

/** The learner Home page. */
export function LearnerHomePreview() {
  return (
    <div className="flex">
      <div className="hidden w-36 shrink-0 flex-col gap-1 border-r border-border p-3 sm:flex">
        {[
          { icon: IconHome, label: "Home", active: true },
          { icon: IconBook, label: "Lessons" },
          { icon: IconTarget, label: "Practice" },
          { icon: IconShieldCheck, label: "Scam Practice" },
          { icon: IconTrendingUp, label: "My Progress" },
        ].map((item) => (
          <span
            key={item.label}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium",
              item.active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground",
            )}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </span>
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div>
          <p className="font-heading text-lg font-bold sm:text-xl">
            Welcome back, Margaret!
          </p>
          <p className="text-xs text-muted-foreground">
            What would you like to do today?
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Tile
            tone="teal"
            icon={IconBook}
            value="12"
            label="lessons finished"
          />
          <Tile
            tone="amber"
            icon={IconCheck}
            value="2 of 3"
            label="done today"
          />
          <Tile tone="green" icon={IconTarget} value="8" label="practiced" />
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <p className="text-sm font-semibold">Your lessons</p>
          {[
            { title: "Spotting Gift Card Scams", done: true },
            { title: "Planning Ahead for Big Bills", done: false },
          ].map((lesson) => (
            <div
              key={lesson.title}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <span className="flex items-center gap-2 text-xs font-medium">
                {lesson.done && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <IconCheck className="size-3" />
                  </span>
                )}
                {lesson.title}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  lesson.done
                    ? "border border-border text-muted-foreground"
                    : "bg-primary text-primary-foreground",
                )}
              >
                {lesson.done ? "Finished" : "Start →"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One page of a lesson, with the step bar and Listen button. */
export function LessonPreview() {
  return (
    <div className="flex flex-col gap-3 p-5">
      <p className="text-xs font-medium text-muted-foreground">Step 2 of 5</p>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-2/5 rounded-full bg-primary" />
      </div>
      <span className="flex w-fit items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium">
        <IconVolume className="size-4" />
        Listen to this page
      </span>
      <p className="font-heading text-base font-semibold">
        Planning Ahead for Big Bills
      </p>
      <p className="text-sm leading-relaxed">
        Some bills only come once or twice a year, like car insurance or
        property taxes. Setting a little aside each month means they won&apos;t
        catch you by surprise.
      </p>
      <div className="flex justify-between border-t border-border pt-3">
        <span className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold">
          ← Back
        </span>
        <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
          Next →
        </span>
      </div>
    </div>
  );
}

/** A pretend scam text message with feedback, as in Scam Practice. */
export function ScamPreview() {
  return (
    <div className="flex flex-col gap-3 p-5">
      <span className="flex w-fit items-center gap-1.5 rounded-full border border-primary/40 bg-accent px-3 py-1 text-[11px] font-bold tracking-wide text-accent-foreground">
        <IconShieldCheck className="size-3.5" />
        PRACTICE · NOT REAL
      </span>
      <div className="mx-auto w-full max-w-xs rounded-[1.75rem] border-[3px] border-foreground/80 bg-background p-3">
        <p className="mb-2 text-center text-[11px] font-semibold text-muted-foreground">
          (555) 010-0147
        </p>
        <p className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-xs leading-relaxed">
          CONGRATULATIONS!!! You WON a $1,000 gift card! Reply with your card
          number to pay the $4.99 shipping fee. Offer ends in 1 HOUR!
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="rounded-lg border border-border px-3 py-2 text-xs">
          Reply with my card number
        </span>
        <span className="flex items-center gap-2 rounded-lg border-2 border-primary bg-accent px-3 py-2 text-xs font-medium">
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <IconCheck className="size-3" />
          </span>
          Delete it and don&apos;t reply
        </span>
      </div>
      <p className="rounded-lg bg-tile-green px-3 py-2 text-xs text-foreground">
        <span className="font-semibold">Well done.</span> You didn&apos;t enter
        a contest, so you can&apos;t win one.
      </p>
    </div>
  );
}

/** The Budget Calculator summary. */
export function BudgetPreview() {
  const lines = [
    { label: "Housing", amount: 1200, width: "w-[44%]" },
    { label: "Groceries", amount: 450, width: "w-[17%]" },
    { label: "Utilities", amount: 260, width: "w-[10%]" },
    { label: "Medicine", amount: 180, width: "w-[7%]" },
  ];
  return (
    <div className="flex flex-col gap-4 p-5">
      <p className="font-heading text-base font-semibold">Retirement example</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Coming in", value: "$2,700" },
          { label: "Going out", value: "$2,350" },
          { label: "Left over", value: "$350" },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-border p-2.5">
            <p className="text-[11px] text-muted-foreground">{t.label}</p>
            <p className="font-heading text-base font-bold">{t.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {lines.map((line) => (
          <div key={line.label} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span>{line.label}</span>
              <span className="text-muted-foreground">
                ${line.amount.toLocaleString("en-US")}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full bg-primary", line.width)}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-2 rounded-lg bg-tile-amber px-3 py-2 text-xs text-foreground">
        <IconCheck className="size-4 shrink-0 text-tile-amber-foreground" />
        You have $350 left over a month.
      </p>
    </div>
  );
}

/** My Progress highlights. */
export function ProgressPreview() {
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-tile-teal p-3">
          <p className="font-heading text-2xl font-bold">12</p>
          <p className="text-xs text-foreground/75">lessons finished</p>
        </div>
        <div className="rounded-xl bg-tile-violet p-3">
          <p className="font-heading text-2xl font-bold">Intermediate</p>
          <p className="text-xs text-foreground/75">scam practice level</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Lessons you finished</p>
        {[
          { title: "Understanding Your Bills", score: "4 of 4" },
          { title: "Building an Emergency Fund", score: "3 of 4" },
          { title: "Safe Ways to Pay", score: "4 of 4" },
        ].map((l) => (
          <div
            key={l.title}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs"
          >
            <span className="flex items-center gap-2 font-medium">
              <IconCheck className="size-4 text-primary-strong" />
              {l.title}
            </span>
            <span className="text-muted-foreground">{l.score} right</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The caregiver's weekly summary for one learner. */
export function CaregiverPreview() {
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <p className="font-heading text-base font-semibold">Margaret</p>
        <span className="rounded-full bg-tile-green px-2.5 py-1 text-[11px] font-semibold text-tile-green-foreground">
          Active this week
        </span>
      </div>
      <div className="rounded-xl border border-border bg-muted/50 p-3 text-xs leading-relaxed">
        <p className="mb-1 font-semibold tracking-wide text-muted-foreground">
          THIS WEEK
        </p>
        Margaret finished 3 lessons and tried 2 pretend scams, picking the safe
        choice every time.
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          { label: "Lessons", value: "12 of 24" },
          { label: "Practiced", value: "8" },
          { label: "Last active", value: "Today" },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-muted-foreground">{s.label}</p>
            <p className="font-heading text-sm font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
        <p className="text-xs font-semibold">Assigned lessons · 2 of 3 done</p>
        {[
          { title: "Spotting Gift Card Scams", done: true },
          { title: "Understanding Your Bills", done: true },
          { title: "Planning Ahead for Big Bills", done: false },
        ].map((l) => (
          <span key={l.title} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full border",
                l.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border",
              )}
            >
              {l.done && <IconCheck className="size-3" />}
            </span>
            {l.title}
          </span>
        ))}
        <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
          Assign a lesson <IconArrowRight className="size-3" />
        </span>
      </div>
    </div>
  );
}
