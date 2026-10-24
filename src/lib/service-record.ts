// The student's service record: verified sessions only, in the order they
// happened. Used by the printable page and the CSV download so both always
// say the same thing.

import { type Session, summarizeHours } from "~/lib/community";
import { loadSessions, loadTimeZone } from "~/lib/community-data";
import type { createClient } from "~/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ServiceRecordRow = {
  id: string;
  date: string;
  minutes: number;
  topic: string;
  activity: string;
  verifier: string;
  verifierRole: "caregiver" | "learner" | "admin";
  verifiedOn: string;
};

export async function loadServiceRecord(
  supabase: SupabaseClient,
  studentId: string,
) {
  const [sessions, timeZone, { data: profile }] = await Promise.all([
    loadSessions(supabase),
    loadTimeZone(supabase, studentId),
    supabase
      .from("student_profiles")
      .select("display_name")
      .eq("id", studentId)
      .maybeSingle(),
  ]);
  const mine = sessions.filter((s: Session) => s.student_id === studentId);
  const { verified, verifiedMinutes } = summarizeHours(mine);
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      timeZone,
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const rows: ServiceRecordRow[] = verified.map((s) => ({
    id: s.id,
    date: day(s.scheduled_at),
    minutes: s.actual_minutes ?? 0,
    topic: s.topic,
    activity: s.activity_notes,
    verifier: s.verified_by_name ?? s.caregiver_name,
    verifierRole: s.verified_by_role ?? "caregiver",
    verifiedOn: s.verified_at ? day(s.verified_at) : "",
  }));

  return {
    studentName: (profile?.display_name as string | undefined) ?? "Student",
    generatedOn: day(new Date().toISOString()),
    rows,
    totalMinutes: verifiedMinutes,
  };
}
