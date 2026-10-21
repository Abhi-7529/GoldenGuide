import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionStatusBadge } from "~/components/community/session-parts";
import { IconBook, IconCheck, IconTrendingUp } from "~/components/icons";
import { StatTile } from "~/components/recipient/stat-tile";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  formatHours,
  formatMinutes,
  SERVICE_RECORD_DISCLAIMER,
  summarizeHours,
  VERIFICATION_NOTE,
} from "~/lib/community";
import { loadSessions, loadTimeZone } from "~/lib/community-data";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Volunteer hours" };

export default async function StudentHoursPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/login");

  const [sessions, timeZone] = await Promise.all([
    loadSessions(supabase),
    loadTimeZone(supabase, userId),
  ]);
  const mine = sessions.filter((s) => s.student_id === userId);
  const { verified, pending, verifiedMinutes, pendingMinutes } =
    summarizeHours(mine);
  const history = mine
    .filter((s) => s.actual_minutes !== null)
    .filter((s) =>
      [
        "verified",
        "pending_verification",
        "correction_requested",
        "disputed",
      ].includes(s.status),
    )
    .reverse();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Volunteer Hours</h1>
        <p className="text-muted-foreground">
          Time you've given, once the family's caregiver has confirmed it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          tone="green"
          icon={IconCheck}
          value={formatHours(verifiedMinutes)}
          label="Verified"
        />
        <StatTile
          tone="amber"
          icon={IconTrendingUp}
          value={formatHours(pendingMinutes)}
          label="Waiting for a caregiver"
        />
        <StatTile
          tone="teal"
          icon={IconBook}
          value={verified.length}
          label={
            verified.length === 1 ? "Verified session" : "Verified sessions"
          }
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-5">
          <div>
            <h2 className="font-semibold">Your service record</h2>
            <p className="text-sm text-muted-foreground">
              A list of your verified sessions to share with your school or
              volunteer organization. It includes only verified time.
            </p>
          </div>
          {verified.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Once a caregiver verifies a session, you can print or download
              your record here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/student/hours/record">View and print record</Link>
              </Button>
              <Button asChild variant="outline">
                {/* A plain link: the route sends a file to download. */}
                <a href="/student/hours/export" download>
                  Download spreadsheet (CSV)
                </a>
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {SERVICE_RECORD_DISCLAIMER} {VERIFICATION_NOTE}
          </p>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Service history
        </h2>
        {history.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No logged time yet. After a session, log your time from My
              Sessions.
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/student/sessions/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">{s.topic}</span>
                    <span
                      className="text-sm text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {new Date(s.scheduled_at).toLocaleDateString("en-US", {
                        timeZone,
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      · {formatMinutes(s.actual_minutes ?? 0)} ·{" "}
                      {s.caregiver_name.split(" ")[0]}'s family
                    </span>
                  </div>
                  <SessionStatusBadge status={s.status} viewer="student" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pending.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Pending time counts once the caregiver verifies it.
          </p>
        )}
      </section>
    </div>
  );
}
