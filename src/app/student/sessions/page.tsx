import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionList, SessionRow } from "~/components/community/session-parts";
import { IconPlus } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { hasStarted, type StudentCommunity } from "~/lib/community";
import { loadSessions, loadTimeZone } from "~/lib/community-data";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "My sessions" };

export default async function StudentSessionsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/login");

  const [sessions, timeZone, { data: communityData }] = await Promise.all([
    loadSessions(supabase),
    loadTimeZone(supabase, userId),
    supabase.rpc("my_student_communities"),
  ]);
  const canRequest = ((communityData as StudentCommunity[] | null) ?? []).some(
    (c) => c.status === "active" && c.learners.length > 0,
  );

  const mine = sessions.filter((s) => s.student_id === userId);
  // Each session sits where the student's next step is. Once there's
  // nothing left for them to do, it moves to Past sessions on its own.
  const toAnswer = mine.filter((s) => s.status === "invited" && !hasStarted(s));
  const toLog = mine.filter(
    (s) =>
      s.status === "correction_requested" ||
      (s.status === "scheduled" && hasStarted(s)),
  );
  const upcoming = mine.filter(
    (s) =>
      (s.status === "pending_approval" || s.status === "scheduled") &&
      !hasStarted(s),
  );
  const current = new Set([...toAnswer, ...toLog, ...upcoming]);
  const past = mine.filter((s) => !current.has(s)).reverse();

  const row = (s: (typeof mine)[number]) => (
    <SessionRow
      key={s.id}
      session={s}
      href={`/student/sessions/${s.id}`}
      timeZone={timeZone}
      who={`with ${s.learner_name}`}
      viewer="student"
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Sessions</h1>
          <p className="text-muted-foreground">
            Sessions you've been asked to teach, and ones you've asked for.
          </p>
        </div>
        {canRequest && (
          <Button asChild>
            <Link href="/student/sessions/new">
              <IconPlus />
              Ask for a session
            </Link>
          </Button>
        )}
      </div>

      {!canRequest && (
        <p className="text-sm text-muted-foreground">
          Once a caregiver chooses who you can help, you can ask for sessions
          here. They can also invite you to one.
        </p>
      )}

      <SessionList title="Needs your answer" sessions={toAnswer}>
        {row}
      </SessionList>
      <SessionList title="Log your time" sessions={toLog}>
        {row}
      </SessionList>
      <SessionList
        title="Upcoming"
        sessions={upcoming}
        empty="Nothing coming up yet."
      >
        {row}
      </SessionList>
      <SessionList title="Past sessions" sessions={past}>
        {row}
      </SessionList>
    </div>
  );
}
