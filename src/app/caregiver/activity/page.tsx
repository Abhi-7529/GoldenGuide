import { Card, CardContent } from "~/components/ui/card";
import { formatDay, loadProgress } from "~/lib/progress";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";

const DAYS_SHOWN = 30;

type ActivityItem = {
  key: string;
  at: string;
  who: string;
  text: string;
};

export default async function CaregiverActivityPage() {
  const supabase = await createClient();
  const { data: connections } = await supabase.rpc("get_my_connections");
  const recipients = ((connections as Connection[] | null) ?? []).filter(
    (c) => c.partner_role === "care_recipient",
  );
  const names = new Map(
    recipients.map((r) => [
      r.partner_id,
      r.partner_full_name || "Your learner",
    ]),
  );

  const since = new Date(Date.now() - DAYS_SHOWN * 24 * 60 * 60 * 1000);
  const { completions, attempts } = await loadProgress(
    supabase,
    recipients.map((r) => r.partner_id),
    since,
  );

  const items: ActivityItem[] = [
    ...completions.map((c) => ({
      key: `lesson-${c.user_id}-${c.lesson_id}-${c.completed_at}`,
      at: c.completed_at,
      who: names.get(c.user_id) ?? "Your learner",
      text:
        `finished the lesson “${c.lesson_title ?? "a lesson"}”` +
        (c.question_count > 0
          ? ` and got ${c.correct_count} of ${c.question_count} questions right`
          : ""),
    })),
    ...attempts.map((a) => ({
      key: `practice-${a.user_id}-${a.scenario_id}-${a.created_at}`,
      at: a.created_at,
      who: names.get(a.user_id) ?? "Your learner",
      text: `practiced “${a.scenario_title ?? "a money situation"}”`,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Lessons and practice from the people you support over the past{" "}
          {DAYS_SHOWN} days.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {recipients.length === 0
              ? "No one is connected yet. Share your invite code from Manage Connection to get started."
              : "No activity in the past 30 days yet."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {items.map((item) => (
                <li
                  key={item.key}
                  className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4"
                >
                  <span className="shrink-0 text-sm text-muted-foreground sm:w-28">
                    {formatDay(item.at)}
                  </span>
                  <span>
                    <span className="font-medium">{item.who}</span> {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
