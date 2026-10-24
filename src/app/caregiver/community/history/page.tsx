import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackLink, SessionRow } from "~/components/community/session-parts";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { env } from "~/env";
import {
  formatHours,
  type SessionStatus,
  STATUS_LABELS,
} from "~/lib/community";
import { loadSessions, loadTimeZone } from "~/lib/community-data";
import { loadMembership } from "~/lib/membership";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Session history" };

const STATUS_FILTERS: {
  value: string;
  label: string;
  statuses: SessionStatus[];
}[] = [
  { value: "", label: "All", statuses: [] },
  {
    value: "upcoming",
    label: "Upcoming",
    statuses: ["pending_approval", "invited", "scheduled"],
  },
  {
    value: "to_confirm",
    label: "Awaiting confirmation",
    statuses: ["pending_verification", "correction_requested"],
  },
  { value: "verified", label: STATUS_LABELS.verified, statuses: ["verified"] },
  { value: "disputed", label: STATUS_LABELS.disputed, statuses: ["disputed"] },
  {
    value: "canceled",
    label: "Canceled or declined",
    statuses: ["canceled", "rejected"],
  },
];

export default async function CaregiverSessionHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!env.NEXT_PUBLIC_COMMUNITY_ENABLED) notFound();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const caregiverId = claimsData?.claims.sub;
  if (!caregiverId) redirect("/login");

  const [params, sessions, timeZone, membership] = await Promise.all([
    searchParams,
    loadSessions(supabase),
    loadTimeZone(supabase, caregiverId),
    loadMembership(supabase),
  ]);
  const isFamily = membership.plan === "family";
  const pick = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };

  const all = sessions
    .filter((s) => s.caregiver_id === caregiverId)
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  const students = [...new Map(all.map((s) => [s.student_id, s.student_name]))];
  const learners = [
    ...new Map(
      all
        .filter((s) => s.learner_id)
        .map((s) => [s.learner_id as string, s.learner_name]),
    ),
  ];

  // Filters are a GoldenGuide Family extra; everyone sees every session.
  const student = isFamily ? pick("student") : "";
  const learner = isFamily ? pick("learner") : "";
  const status = isFamily ? pick("status") : "";
  const search = isFamily ? pick("q").trim().toLowerCase() : "";
  const statuses =
    STATUS_FILTERS.find((f) => f.value === status)?.statuses ?? [];
  const shown = all.filter(
    (s) =>
      (!student || s.student_id === student) &&
      (!learner || s.learner_id === learner) &&
      (statuses.length === 0 || statuses.includes(s.status)) &&
      (!search ||
        s.topic.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search)),
  );
  const verifiedMinutes = shown
    .filter((s) => s.status === "verified")
    .reduce((sum, s) => sum + (s.actual_minutes ?? 0), 0);

  // Group by month, newest first.
  const months = new Map<string, typeof shown>();
  for (const s of shown) {
    const month = new Date(s.scheduled_at).toLocaleDateString("en-US", {
      timeZone,
      month: "long",
      year: "numeric",
    });
    months.set(month, [...(months.get(month) ?? []), s]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href="/caregiver/community">Back to Community</BackLink>
        <h1 className="text-xl font-semibold">Session history</h1>
        <p className="text-sm text-muted-foreground">
          Every session in your community, newest first. Session notes appear on
          a session's page when the student shares them.
        </p>
      </div>

      {isFamily ? (
        <Card>
          <CardContent className="py-5">
            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="student">Student</Label>
                <Select id="student" name="student" defaultValue={student}>
                  <option value="">All students</option>
                  {students.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="learner">Learner</Label>
                <Select id="learner" name="learner" defaultValue={learner}>
                  <option value="">All learners</option>
                  {learners.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>
                <Select id="status" name="status" defaultValue={status}>
                  {STATUS_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q">Topic</Label>
                <Input
                  id="q"
                  name="q"
                  defaultValue={pick("q")}
                  placeholder="Search topics"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Filter</Button>
                <Button asChild variant="ghost">
                  <Link href="/caregiver/community/history">Clear</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-xl border border-border bg-accent/40 p-3 text-sm">
          Want to filter by student, learner or status, or search topics?{" "}
          <Link
            href="/caregiver/membership"
            className="font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            GoldenGuide Family
          </Link>{" "}
          adds these, plus sessions up to 2 hours.
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        {shown.length} {shown.length === 1 ? "session" : "sessions"} ·{" "}
        {formatHours(verifiedMinutes)} verified
      </p>

      {shown.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No sessions {all.length > 0 ? "match these filters" : "yet"}.
          </CardContent>
        </Card>
      ) : (
        [...months].map(([month, list]) => (
          <section key={month} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {month}
            </h2>
            {list.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                href={`/caregiver/community/sessions/${s.id}`}
                timeZone={timeZone}
                who={`${s.student_name} with ${s.learner_name}`}
                viewer="caregiver"
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
