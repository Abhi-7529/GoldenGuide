import Link from "next/link";
import {
  IconArrowRight,
  IconBook,
  IconMessageCircle,
  IconShieldCheck,
  IconTrendingUp,
} from "~/components/icons";
import { BrowserFrame, CaregiverPreview } from "~/components/landing/previews";
import { Button } from "~/components/ui/button";

const points = [
  {
    icon: IconBook,
    title: "Choose helpful lessons",
    body: "Assign lessons or suggest topics that fit what your loved one is facing.",
  },
  {
    icon: IconTrendingUp,
    title: "Follow progress, with permission",
    body: "Once they connect with your invite code, see the lessons they finish and the practice they try.",
  },
  {
    icon: IconMessageCircle,
    title: "Encourage and stay in touch",
    body: 'Send a message, cheer them on, or answer a quick "Is this a scam?" question.',
  },
];

export function CaregiverSection() {
  return (
    <section id="for-caregivers" className="scroll-mt-20 px-6 py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-semibold tracking-widest text-primary-strong uppercase">
            For family caregivers
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Support their independence, not their decisions
          </h2>
          <p className="text-xl leading-relaxed text-muted-foreground">
            GoldenGuide helps you encourage a parent or loved one to learn, at
            their own pace. They stay in charge of their own money.
          </p>
          <ul className="flex flex-col gap-5">
            {points.map((point) => (
              <li key={point.title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary-strong">
                  <point.icon className="size-6" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-lg font-semibold">{point.title}</span>
                  <span className="text-lg text-muted-foreground">
                    {point.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-base">
            <IconShieldCheck className="mt-0.5 size-5 shrink-0 text-primary-strong" />
            Caregivers never see bank accounts or move money. Personal budgets
            stay private unless your loved one chooses to share them.
          </p>
          <Button asChild size="xl" className="w-full sm:w-fit">
            <Link href="/signup">
              Support a Loved One
              <IconArrowRight />
            </Link>
          </Button>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-6 -z-10 rounded-3xl bg-tile-amber blur-2xl"
          />
          <BrowserFrame
            label="Preview of the caregiver dashboard: a weekly summary and assigned lessons for one learner"
            className="mx-auto max-w-md"
          >
            <CaregiverPreview />
          </BrowserFrame>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Example of a caregiver&apos;s weekly summary
          </p>
        </div>
      </div>
    </section>
  );
}
