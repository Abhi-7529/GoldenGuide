import Link from "next/link";
import { Button } from "~/components/ui/button";

export function CTA() {
  return (
    <section
      id="get-started"
      className="border-t border-border bg-muted/40 px-6 py-24 text-center"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Help make financial decisions easier to understand.
        </h2>
        <p className="text-lg text-muted-foreground">
          Give your loved one a simple way to learn, practice, and build
          confidence with money.
        </p>
        <Button asChild size="lg">
          <Link href="#get-started">Get Started</Link>
        </Button>
      </div>
    </section>
  );
}
