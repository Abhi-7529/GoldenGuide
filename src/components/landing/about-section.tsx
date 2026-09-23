import { IconBook, IconShieldCheck, IconUsers } from "~/components/icons";

const values = [
  {
    icon: IconBook,
    title: "Clarity first",
    body: "We explain financial concepts the way you'd want a knowledgeable friend to explain them — plainly, and without judgment.",
  },
  {
    icon: IconUsers,
    title: "Made with families in mind",
    body: "We design every feature thinking about both the person learning and the people who care about them.",
  },
  {
    icon: IconShieldCheck,
    title: "Practice before it's real",
    body: "Every scenario mirrors a real financial decision, so confidence is already built before the moment actually happens.",
  },
];

export function AboutSection() {
  return (
    <section id="about" className="border-t border-border px-6 py-20">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-4 text-left">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            About Us
          </span>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Built for a simpler kind of confidence.
          </h2>
          <p className="text-lg text-muted-foreground">
            GoldenGuide was created with a simple belief: staying financially
            independent shouldn't get harder with age. We build plain-language
            lessons and real-world practice scenarios so older adults can
            navigate today's banking, bills, and scams with confidence — and so
            the families who love them can worry a little less.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {values.map((value) => (
            <div key={value.title} className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <value.icon className="size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">{value.title}</h3>
                <p className="text-muted-foreground">{value.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
