import { IconCheck } from "~/components/icons";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

const completedLessons = [
  "Understanding Your Monthly Budget",
  "Recognizing Common Financial Scams",
  "Reading a Bill Statement",
];

const activity = [
  { text: "Completed a scam-awareness scenario", time: "2 days ago" },
  { text: "Finished lesson: Understanding Interest", time: "5 days ago" },
  { text: "Started topic: Managing Savings", time: "1 week ago" },
];

export function CaregiverSection() {
  return (
    <section id="for-caregivers" className="border-t border-border px-6 py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-4 text-left">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Support them without taking control.
          </h2>
          <p className="text-lg text-muted-foreground">
            GoldenGuide gives caregivers a simple way to support an older
            adult's financial learning, while allowing them to remain in control
            of their own decisions.
          </p>
        </div>

        <Card className="w-full shadow-md">
          <CardHeader className="gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Caregiver View
            </span>
            <h3 className="text-lg font-semibold">Learning Progress</h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Overall progress</span>
                <span>68%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[68%] rounded-full bg-primary" />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Completed lessons</p>
              <ul className="flex flex-col gap-2">
                {completedLessons.map((lesson) => (
                  <li
                    key={lesson}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <IconCheck className="size-4 shrink-0 text-primary" />
                    {lesson}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Topics being studied</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Managing Savings</Badge>
                <Badge variant="secondary">Understanding Loans</Badge>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Recent activity</p>
              <ul className="flex flex-col gap-2">
                {activity.map((item) => (
                  <li
                    key={item.text}
                    className="flex items-center justify-between text-sm text-muted-foreground"
                  >
                    <span>{item.text}</span>
                    <span className="text-xs">{item.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
