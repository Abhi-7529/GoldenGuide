import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { JoinMeetingButton } from "~/components/community/join-meeting-button";
import { SharedSessionNotes } from "~/components/community/session-notes";
import { LearnerConfirmTime } from "~/components/recipient/learner-confirm-time";
import { LearnerSessionAnswer } from "~/components/recipient/learner-session-answer";
import { Card, CardContent } from "~/components/ui/card";
import { env } from "~/env";
import {
  formatMinutes,
  formatSessionTime,
  hasStarted,
  type Session,
  type SessionNotes,
} from "~/lib/community";
import { loadNotes, loadSessions, loadTimeZone } from "~/lib/community-data";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Community" };

/** First name only; that's all a learner needs to know about a student. */
function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "A student";
}

/** Still worth showing at the top: not over yet, or just finished. */
function stillCurrent(session: Session) {
  const end =
    new Date(session.scheduled_at).getTime() +
    (session.planned_minutes + 60) * 60_000;
  return Date.now() < end;
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
      (["pending_approval", "invited"].includes(s.status) && !hasStarted(s)) ||
      (s.status === "scheduled" && stillCurrent(s)),
  );
  const toConfirm = mine.filter((s) => s.status === "pending_verification");
  const past = mine
    .filter(
      (s) =>
        ["correction_requested", "verified", "disputed"].includes(s.status) ||
        (s.status === "scheduled" && !stillCurrent(s)),
    )
    .reverse();
  // Only notes the student chose to share come back.
  const notesById = await loadNotes(
    supabase,
    [...toConfirm, ...past].map((s) => s.id),
  );

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

      {toConfirm.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">Please check</h2>
          {toConfirm.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-4 rounded-2xl border-2 border-primary/50 bg-card p-6 shadow-card"
            >
              <p className="text-xl" suppressHydrationWarning>
                <strong>{firstName(s.student_name)}</strong> says you spent{" "}
                <strong>{formatMinutes(s.actual_minutes ?? 0)}</strong> together
                learning about <strong>{s.topic}</strong> on{" "}
                {formatSessionTime(s.scheduled_at, timeZone)}.
              </p>
              <p className="text-xl">Is that right?</p>
              <LearnerConfirmTime sessionId={s.id} />
              <PastNotes
                notes={notesById.get(s.id)}
                studentName={firstName(s.student_name)}
              />
            </div>
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">Past sessions</h2>
          <ul className="flex flex-col gap-3">
            {past.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-lg shadow-card"
              >
                <div>
                  <p className="font-semibold">{s.topic}</p>
                  <p className="text-muted-foreground" suppressHydrationWarning>
                    With {firstName(s.student_name)} ·{" "}
                    {formatSessionTime(s.scheduled_at, timeZone)}
                  </p>
                </div>
                <PastNotes
                  notes={notesById.get(s.id)}
                  studentName={firstName(s.student_name)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PastNotes({
  notes,
  studentName,
}: {
  notes: SessionNotes | undefined;
  studentName: string;
}) {
  if (!notes) return null;
  return <SharedSessionNotes notes={notes} studentName={studentName} large />;
}

function UpcomingSession({
  session,
  timeZone,
}: {
  session: Session;
  timeZone: string;
}) {
  const confirmed = session.status === "scheduled";
  const started = hasStarted(session);
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
      {confirmed ? (
        <JoinMeetingButton session={session} large />
      ) : (
        <p className="text-lg text-muted-foreground">
          Not confirmed yet. We'll show the details here once it is.
        </p>
      )}
      {!started && (
        <LearnerSessionAnswer
          sessionId={session.id}
          answer={session.learner_response}
        />
      )}
    </div>
  );
}
