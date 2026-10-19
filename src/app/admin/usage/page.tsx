import type { Metadata } from "next";
import { StatCard } from "~/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { createClient } from "~/lib/supabase/server";
import type { AdminUsage } from "~/lib/types";

export const metadata: Metadata = { title: "Usage" };

function TopList({
  title,
  empty,
  rows,
  unit,
}: {
  title: string;
  empty: string;
  rows: { label: string; count: number }[];
  unit: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li
                key={r.label}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 text-muted-foreground">
                  {r.count} {unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AdminUsagePage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_usage");
  const u = data as AdminUsage | null;

  if (!u) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Usage statistics could not be loaded.
        </CardContent>
      </Card>
    );
  }

  const maxSignups = Math.max(1, ...u.signups_by_day.map((d) => d.count));

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Activity
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active, last 7 days"
            value={u.active_7d}
            hint="Users who signed in"
          />
          <StatCard
            label="Active, last 30 days"
            value={u.active_30d}
            hint="Users who signed in"
          />
          <StatCard label="New users, 7 days" value={u.signups_7d} />
          <StatCard label="New users, 30 days" value={u.signups_30d} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Lesson views"
            value={u.lesson_views_total}
            hint={`${u.lesson_views_7d} in the last 7 days`}
          />
          <StatCard
            label="Practice attempts"
            value={u.scenario_attempts_total}
            hint={`${u.scenario_attempts_7d} in the last 7 days`}
          />
          <StatCard
            label="Messages sent"
            value={u.messages_total}
            hint={`${u.messages_7d} in the last 7 days`}
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>New users, last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-1.5">
            {u.signups_by_day.map((d) => (
              <div
                key={d.day}
                className="flex h-full flex-1 flex-col justify-end"
                title={`${d.day}: ${d.count}`}
              >
                <div
                  className="w-full rounded-t bg-primary"
                  style={{
                    height: `${d.count === 0 ? 2 : (d.count / maxSignups) * 100}%`,
                    opacity: d.count === 0 ? 0.25 : 1,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{u.signups_by_day[0]?.day}</span>
            <span>{u.signups_by_day[u.signups_by_day.length - 1]?.day}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <TopList
          title="Most viewed lessons"
          empty="No lesson views yet."
          unit="views"
          rows={u.top_lessons.map((l) => ({ label: l.title, count: l.views }))}
        />
        <TopList
          title="Most practiced scenarios"
          empty="No practice attempts yet."
          unit="attempts"
          rows={u.top_scenarios.map((s) => ({
            label: s.title,
            count: s.attempts,
          }))}
        />
      </div>
    </div>
  );
}
