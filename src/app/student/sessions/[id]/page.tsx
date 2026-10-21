import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  BackLink,
  SessionFacts,
  SessionHistory,
  SessionStatusBadge,
} from "~/components/community/session-parts";
import { StudentSessionActions } from "~/components/community/student-session-actions";
import { Card, CardContent } from "~/components/ui/card";
import { NOTE_STATUSES } from "~/lib/community";
import { loadSession, loadTimeZone } from "~/lib/community-data";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Session" };

export default async function StudentSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/login");

  const [{ session, events }, timeZone] = await Promise.all([
    loadSession(supabase, id),
    loadTimeZone(supabase, userId),
  ]);
  if (!session || session.student_id !== userId) notFound();

  const caregiverFirst = session.caregiver_name.split(" ")[0];
  const showNote =
    session.caregiver_note && NOTE_STATUSES.includes(session.status);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href="/student/sessions">Back to My Sessions</BackLink>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{session.topic}</h1>
          <SessionStatusBadge status={session.status} viewer="student" />
        </div>
        <p className="text-muted-foreground">
          With {session.learner_name}, in {caregiverFirst}'s family.
        </p>
        {showNote && (
          <p className="rounded-xl border border-border bg-accent/40 p-3 text-sm">
            {caregiverFirst} wrote: "{session.caregiver_note}"
          </p>
        )}
      </div>

      <StudentSessionActions session={session} />

      <Card>
        <CardContent className="py-5">
          <SessionFacts session={session} timeZone={timeZone} />
        </CardContent>
      </Card>

      <SessionHistory events={events} timeZone={timeZone} />
    </div>
  );
}
