import { IconBook, IconTarget, IconTrendingUp } from "~/components/icons";

const steps = [
  {
    number: "1",
    icon: IconBook,
    title: "Learn",
    body: "Understand financial topics through simple explanations.",
  },
  {
    number: "2",
    icon: IconTarget,
    title: "Practice",
    body: "Use realistic scenarios to practice making financial decisions.",
  },
  {
    number: "3",
    icon: IconTrendingUp,
    title: "Build Confidence",
    body: "Apply what you learn to everyday financial situations.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          How GoldenGuide Works
        </h2>

        <div className="mt-12 grid gap-10 sm:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.number}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <s.icon className="size-7" />
                <span className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {s.number}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="max-w-xs text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
