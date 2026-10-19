import Link from "next/link";
import { IconArrowRight, IconCheck, IconShieldCheck } from "~/components/icons";
import {
  BrowserFrame,
  LearnerHomePreview,
} from "~/components/landing/previews";
import { Button } from "~/components/ui/button";

const reassurances = [
  "Free to start",
  "Large, easy-to-read text",
  "Family caregivers welcome",
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-6 pt-14 pb-20 sm:pt-20 sm:pb-28">
      {/* Soft background glow and a faint dot grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-40 -left-32 size-[32rem] rounded-full bg-tile-amber opacity-70 blur-3xl" />
        <div className="absolute top-20 -right-40 size-[36rem] rounded-full bg-tile-teal opacity-60 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
        <div className="flex flex-col items-start gap-6">
          <span className="flex items-center gap-2 rounded-full border border-primary/30 bg-card/80 px-4 py-1.5 text-sm font-medium shadow-sm backdrop-blur">
            <span className="size-2 rounded-full bg-primary" />
            Money lessons made for older adults
          </span>
          <h1 className="text-5xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl">
            Financial Confidence{" "}
            <span className="bg-gradient-to-r from-primary-strong to-primary bg-clip-text text-transparent">
              Starts Here.
            </span>
          </h1>
          <p className="max-w-xl text-xl leading-relaxed text-muted-foreground">
            Build confidence in everyday financial decisions through simple
            lessons, realistic practice, and personalized learning designed for
            older adults.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="xl" className="shadow-md">
              <Link href="/signup">
                Get Started for Free
                <IconArrowRight />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline" className="bg-card/80">
              <Link href="#how-it-works">Explore How It Works</Link>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {reassurances.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-base text-muted-foreground"
              >
                <IconCheck className="size-5 text-primary-strong" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <BrowserFrame label="Preview of the GoldenGuide learner home page, showing lessons finished, today's lessons and practice">
            <LearnerHomePreview />
          </BrowserFrame>
          <div
            aria-hidden="true"
            className="absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card motion-safe:animate-float sm:flex lg:-left-10"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-tile-green text-tile-green-foreground">
              <IconShieldCheck className="size-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold">Scam spotted!</span>
              <span className="text-xs text-muted-foreground">
                Safe practice, no real risk
              </span>
            </span>
          </div>
          <div
            aria-hidden="true"
            className="absolute -top-5 -right-3 hidden items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-card motion-safe:animate-float-slow sm:flex"
          >
            <span className="font-heading text-lg font-bold text-primary-strong">
              Aa
            </span>
            <span className="text-xs font-medium">Bigger text anytime</span>
          </div>
        </div>
      </div>
    </section>
  );
}
