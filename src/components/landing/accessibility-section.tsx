import type * as React from "react";
import {
  IconBook,
  IconCheck,
  IconHome,
  IconMessageCircle,
  IconVolume,
} from "~/components/icons";

const points: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
}[] = [
  {
    icon: IconHome,
    title: "Clear, simple navigation",
    body: "Big buttons with words, not puzzles. Home is always one tap away.",
  },
  {
    icon: IconBook,
    title: "Large, readable text",
    body: "Comfortable text by default, with larger sizes and high contrast in Settings.",
  },
  {
    icon: IconCheck,
    title: "One step at a time",
    body: "Lessons show a little at a time, so it never feels like too much.",
  },
  {
    icon: IconVolume,
    title: "Learn at your own pace",
    body: "No timers and no rush. Listen along, stop, and come back whenever you like.",
  },
  {
    icon: IconMessageCircle,
    title: "Helpful feedback, no pressure",
    body: "Every answer comes with a kind explanation. There's no failing here.",
  },
];

export function AccessibilitySection() {
  return (
    <section className="bg-navy px-6 py-20 text-navy-foreground sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">
            Designed for older adults
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Comfortable to use from the very first visit
          </h2>
          <p className="text-xl leading-relaxed text-navy-muted">
            GoldenGuide was built for people who didn&apos;t grow up with apps.
            Everything is plain, calm and easy to read.
          </p>
          {/* A small picture of the text size setting */}
          <div
            aria-hidden="true"
            className="flex items-end gap-3 rounded-2xl border border-navy-foreground/15 bg-navy-foreground/5 p-5"
          >
            {[
              { size: "text-2xl", label: "Normal" },
              { size: "text-4xl", label: "Large" },
              { size: "text-5xl", label: "Extra large", active: true },
            ].map((s) => (
              <span
                key={s.label}
                className={`flex flex-1 flex-col items-center gap-2 rounded-xl px-2 py-3 ${s.active ? "bg-primary text-primary-foreground" : ""}`}
              >
                <span className={`font-heading font-bold ${s.size}`}>Aa</span>
                <span className="text-xs font-medium">{s.label}</span>
              </span>
            ))}
          </div>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {points.map((point, index) => (
            <li
              key={point.title}
              className={`flex flex-col gap-3 rounded-2xl border border-navy-foreground/15 bg-navy-foreground/5 p-6 ${index === points.length - 1 ? "sm:col-span-2" : ""}`}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <point.icon className="size-6" />
              </span>
              <h3 className="text-xl font-semibold">{point.title}</h3>
              <p className="text-lg text-navy-muted">{point.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
