import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

export function Hero() {
  return (
    <section className="px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-6 text-left">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Helping older adults feel more confident with their money.
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            GoldenGuide makes financial topics easier to understand, helping
            older adults build confidence while giving caregivers peace of mind.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="#get-started">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>
        </div>

        <Card className="w-full shadow-md">
          <CardHeader className="gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Today's Lesson
            </span>
            <h2 className="text-lg font-semibold">
              Understanding Your Monthly Budget
            </h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Not started yet
              </span>
              <Button asChild size="sm">
                <Link href="#get-started">Start Free Lesson</Link>
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-sm font-medium">
                Your electric bill went up by $15 this month. What's your next
                step?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs">
                  Check what changed
                </span>
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs">
                  Adjust next month's budget
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
