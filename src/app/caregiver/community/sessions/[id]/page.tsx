import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CaregiverSessionActions } from "~/components/community/caregiver-session-actions";
import { JoinMeetingButton } from "~/components/community/join-meeting-button";
import { SharedSessionNotes } from "~/components/community/session-notes";
import {
  BackLink,
  SessionFacts,
  SessionHistory,
  SessionStatusBadge,
} from "~/components/community/session-parts";
import { Card, CardContent } from "~/components/ui/card";
import { env } from "~/env";
import {
  hasStarted,
  NOTE_STATUSES,
  NOTES_STATUSES,
  PLANNED_MINUTES,
} from "~/lib/community";
import { loadNotes, loadSession, loadTimeZone } from "~/lib/community-data";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Session" };

export default async function CaregiverSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!env.NEXT_PUBLIC_COMMUNITY_ENABLED) notFound();

  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/login");

  const [{ session, events }, timeZone, notesById, { data: maxData }] =
    await Promise.all([
      loadSession(supabase, id),
      loadTimeZone(supabase, userId),
      loadNotes(supabase, [id]),
      supabase.rpc("my_max_session_minutes"),
    ]);
  if (!session || session.caregiver_id !== userId) notFound();
  // RLS only returns the notes once the student shares them.
  const notes = notesById.get(session.id);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href="/caregiver/community">Back to Community</BackLink>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{session.topic}</h1>
          <SessionStatusBadge
            status={session.status}
            viewer="caregiver"
            timePassed={hasStarted(session)}
          />
        </div>
        {session.learner_response === "yes" && (
          <p className="text-sm text-muted-foreground">
            {session.learner_name} said they'd like this session.
          </p>
        )}
        {session.learner_response === "no" && (
          <p className="text-sm text-muted-foreground">
            {session.learner_name} said "not this time".
          </p>
        )}
        {session.caregiver_note && NOTE_STATUSES.includes(session.status) && (
          <p className="text-sm text-muted-foreground">
            Your note: "{session.caregiver_note}"
          </p>
        )}
      </div>

      <JoinMeetingButton session={session} />

      <CaregiverSessionActions
        session={session}
        maxMinutes={(maxData as number | null) ?? PLANNED_MINUTES}
      />

      {notes ? (
        <SharedSessionNotes notes={notes} studentName={session.student_name} />
      ) : (
        NOTES_STATUSES.includes(session.status) && (
          <p className="text-sm text-muted-foreground">
            {session.student_name} hasn't shared session notes yet.
          </p>
        )
      )}

      <Card>
        <CardContent className="py-5">
          <SessionFacts session={session} timeZone={timeZone} />
        </CardContent>
      </Card>

      <SessionHistory events={events} timeZone={timeZone} />
    </div>
  );
}
