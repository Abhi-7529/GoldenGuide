import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LearnerSessionAnswer } from "~/components/recipient/learner-session-answer";
import { Card, CardContent } from "~/components/ui/card";
import { env } from "~/env";
import {
  formatMinutes,
  formatSessionTime,
  hasStarted,
  type Session,
} from "~/lib/community";
import { loadSessions, loadTimeZone } from "~/lib/community-data";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Community" };

/** First name only; that's all a learner needs to know about a student. */
function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "A student";
}

export default async function LearnerCommunityPage() {
  if (!env.NEXT_PUBLIC_COMMUNITY_ENABLED) notFound();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/login");

  const [sessions, timeZone] = await Promise.all([
    loadSessions(supabase),
    loadTimeZone(supabase, userId),
  ]);
  const mine = sessions.filter((s) => s.learner_id === userId);
  const upcoming = mine.filter(
    (s) =>
      ["pending_approval", "invited", "scheduled"].includes(s.status) &&
      !hasStarted(s),
  );
  const past = mine
    .filter(
      (s) =>
        [
          "pending_verification",
          "correction_requested",
          "verified",
          "disputed",
        ].includes(s.status) ||
        (s.status === "scheduled" && hasStarted(s)),
    )
    .reverse();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-xl">
          Learn with a student volunteer your caregiver knows and trusts. It's
          always your choice to take part.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Coming up</h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-xl text-muted-foreground">
              No sessions planned right now. Your caregiver will set them up
              with you.
            </CardContent>
          </Card>
        ) : (
          upcoming.map((s) => (
            <UpcomingSession key={s.id} session={s} timeZone={timeZone} />
          ))
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">Past sessions</h2>
          <ul className="flex flex-col gap-3">
            {past.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-border bg-card p-5 text-lg shadow-card"
              >
                <p className="font-semibold">{s.topic}</p>
                <p className="text-muted-foreground" suppressHydrationWarning>
                  With {firstName(s.student_name)} ·{" "}
                  {formatSessionTime(s.scheduled_at, timeZone)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function UpcomingSession({
  session,
  timeZone,
}: {
  session: Session;
  timeZone: string;
}) {
  const confirmed = session.status === "scheduled";
  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-border bg-card p-6 shadow-card">
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-semibold">{session.topic}</p>
        <p className="text-xl">
          With <strong>{firstName(session.student_name)}</strong>, a student
          volunteer
        </p>
      </div>
      <dl className="flex flex-col gap-2 text-xl">
        <div>
          <dt className="text-lg text-muted-foreground">When</dt>
          <dd suppressHydrationWarning>
            {formatSessionTime(session.scheduled_at, timeZone)}
          </dd>
        </div>
        <div>
          <dt className="text-lg text-muted-foreground">How long</dt>
          <dd>About {formatMinutes(session.planned_minutes)}</dd>
        </div>
        {confirmed && session.join_details && (
          <div>
            <dt className="text-lg text-muted-foreground">How to join</dt>
            <dd>{session.join_details}</dd>
          </div>
        )}
      </dl>
      {!confirmed && (
        <p className="text-lg text-muted-foreground">
          Not confirmed yet. We'll show the details here once it is.
        </p>
      )}
      <LearnerSessionAnswer
        sessionId={session.id}
        answer={session.learner_response}
      />
    </div>
  );
}
