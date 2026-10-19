import Link from "next/link";
import { IconArrowRight } from "~/components/icons";
import { Button } from "~/components/ui/button";

export function CTA() {
  return (
    <section id="get-started" className="px-6 pb-20 sm:pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-navy px-8 py-16 text-center text-navy-foreground sm:px-16 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,var(--primary)_0%,transparent_45%),radial-gradient(circle_at_90%_100%,var(--tile-teal-foreground)_0%,transparent_40%)] opacity-35"
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Take the First Step Toward Financial Confidence.
          </h2>
          <p className="text-xl leading-relaxed text-navy-muted">
            Start learning, practicing, and building the skills to make everyday
            financial decisions with confidence.
          </p>
          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="xl" className="shadow-lg">
              <Link href="/signup">
                Get Started for Free
                <IconArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="border-navy-foreground/30 bg-transparent text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground"
            >
              <Link href="/help">Questions? Visit Help</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
