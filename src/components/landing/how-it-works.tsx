import { IconBook, IconTarget, IconUser } from "~/components/icons";

const steps = [
  {
    icon: IconUser,
    title: "Personalize your learning",
    body: "Choose the money topics and goals that matter to you. GoldenGuide suggests lessons that fit.",
  },
  {
    icon: IconBook,
    title: "Learn at your own pace",
    body: "Short, easy-to-understand lessons about everyday money decisions, one small step at a time.",
  },
  {
    icon: IconTarget,
    title: "Practice with confidence",
    body: "Try what you learned with realistic situations, budgeting activities and pretend scams that are completely safe.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 px-6 py-20 sm:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
          <p className="text-sm font-semibold tracking-widest text-primary-strong uppercase">
            How GoldenGuide works
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Three simple steps to feeling sure about money
          </h2>
        </div>

        <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          {/* The line that connects the steps on wider screens */}
          <div
            aria-hidden="true"
            className="absolute top-8 right-[16%] left-[16%] hidden border-t-2 border-dashed border-primary/40 md:block"
          />
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative flex flex-col items-center gap-4 text-center"
            >
              <div className="relative flex size-16 items-center justify-center rounded-2xl bg-card text-primary-strong shadow-card ring-1 ring-border">
                <step.icon className="size-8" />
                <span className="absolute -top-2.5 -right-2.5 flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="max-w-xs text-lg text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
