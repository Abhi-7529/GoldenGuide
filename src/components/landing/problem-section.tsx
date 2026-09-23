import {
  IconMessageCircle,
  IconShieldAlert,
  IconSplit,
} from "~/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

const problems = [
  {
    icon: IconMessageCircle,
    title: "Confusing Financial Terms",
    body: "Understand financial concepts without complicated language.",
  },
  {
    icon: IconSplit,
    title: "Everyday Money Decisions",
    body: "Practice making decisions about spending, saving, and managing expenses.",
  },
  {
    icon: IconShieldAlert,
    title: "Financial Scams",
    body: "Learn how to recognize common warning signs and protect yourself.",
  },
];

export function ProblemSection() {
  return (
    <section className="border-t border-border bg-muted/40 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Money can become harder to manage when financial decisions become
            more complicated.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Confusing terms, changing expenses, bills, and unfamiliar decisions
            can all add up — GoldenGuide breaks it down one step at a time.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {problems.map((p) => (
            <Card key={p.title}>
              <CardHeader>
                <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <p.icon className="size-5" />
                </div>
                <CardTitle>{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {p.body}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
