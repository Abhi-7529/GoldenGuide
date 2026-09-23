import {
  IconBarChart,
  IconBook,
  IconPiggyBank,
  IconShieldAlert,
  IconTarget,
  IconUsers,
} from "~/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

const features = [
  {
    icon: IconBook,
    title: "Simple Lessons",
    body: "Understand financial concepts in plain language.",
  },
  {
    icon: IconTarget,
    title: "Interactive Scenarios",
    body: "Practice handling realistic financial situations.",
  },
  {
    icon: IconShieldAlert,
    title: "Scam Awareness",
    body: "Learn common signs of financial scams.",
  },
  {
    icon: IconBarChart,
    title: "Progress Tracking",
    body: "See what has been learned and what still needs practice.",
  },
  {
    icon: IconPiggyBank,
    title: "Financial Basics",
    body: "Learn about budgeting, saving, interest, bills, and more.",
  },
  {
    icon: IconUsers,
    title: "Caregiver Support",
    body: "Give family members a simple way to encourage financial learning.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="border-t border-border bg-muted/40 px-6 py-20"
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Everything needed to feel confident with money
        </h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </div>
                <CardTitle>{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {f.body}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
