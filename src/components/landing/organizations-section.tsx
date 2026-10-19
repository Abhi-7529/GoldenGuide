import Link from "next/link";
import { IconArrowRight, IconCheck, IconUsers } from "~/components/icons";
import { Button } from "~/components/ui/button";

const today = [
  "Members sign up for free and learn independently",
  "Every lesson, practice and pretend scam included",
  "Family caregivers can follow along and help",
];

const planned = [
  "Group sessions and shared activities",
  "Organization-level learning dashboard",
  "Group pricing",
];

export function OrganizationsSection() {
  return (
    <section className="px-6 py-20 sm:py-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card sm:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-tile-teal blur-3xl"
        />
        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="flex flex-col gap-5">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-tile-teal text-tile-teal-foreground">
              <IconUsers className="size-6" />
            </span>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              GoldenGuide for Organizations
            </h2>
            <p className="text-xl leading-relaxed text-muted-foreground">
              Senior centers, retirement communities, libraries and nonprofits
              can explore using GoldenGuide to support the financial education
              of the people they serve.
            </p>
            <Button asChild size="xl" variant="outline" className="w-fit">
              <Link href="/organizations">
                Learn More
                <IconArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl bg-tile-green p-5">
              <p className="text-base font-semibold">Available today</p>
              <ul className="flex flex-col gap-2">
                {today.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-base">
                    <IconCheck className="mt-1 size-4 shrink-0 text-tile-green-foreground" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-5">
              <p className="text-base font-semibold">
                Planned{" "}
                <span className="font-normal text-muted-foreground">
                  (not available yet)
                </span>
              </p>
              <ul className="flex flex-col gap-2">
                {planned.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-base text-muted-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
