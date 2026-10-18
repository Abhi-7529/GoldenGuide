import type * as React from "react";
import { cn } from "~/lib/utils";

const tones = {
  teal: "bg-tile-teal text-tile-teal-foreground",
  amber: "bg-tile-amber text-tile-amber-foreground",
  green: "bg-tile-green text-tile-green-foreground",
  violet: "bg-tile-violet text-tile-violet-foreground",
};

export type Tone = keyof typeof tones;

export function toneClass(tone: Tone) {
  return tones[tone];
}

/** A soft tinted card with one big number, for quick at-a-glance progress. */
export function StatTile({
  tone,
  icon: Icon,
  value,
  label,
}: {
  tone: Tone;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border/60 p-5 shadow-card",
        tones[tone],
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-card/70">
        <Icon className="size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="whitespace-nowrap font-heading text-4xl font-bold text-foreground">
          {value}
        </p>
        <p className="text-lg text-foreground/80">{label}</p>
      </div>
    </div>
  );
}
