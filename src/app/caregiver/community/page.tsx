import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InvitationManager } from "~/components/community/invitation-manager";
import { SessionList, SessionRow } from "~/components/community/session-parts";
import { StudentCard } from "~/components/community/student-card";
import { IconPlus } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { env } from "~/env";
import {
  type CommunityLearner,
  type CommunityStudent,
  type GuardianStatus,
  type Invitation,
  isCleared,
  type StudentSkill,
} from "~/lib/community";
import { loadSessions, loadTimeZone } from "~/lib/community-data";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";

export const metadata: Metadata = { title: "Community" };

type MemberRow = {
  student_id: string;
  status: "active" | "removed";
  joined_at: string;
  removed_at: string | null;
  student_profiles: {
    display_name: string;
    intro: string;
    availability: string;
    interests: string;
    age_group: string | null;
    guardian_status: GuardianStatus;
    student_skills: StudentSkill[];
  } | null;
};

export default async function CaregiverCommunityPage() {
  if (!env.NEXT_PUBLIC_COMMUNITY_ENABLED) notFound();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const caregiverId = claimsData?.claims.sub;

  if (!caregiverId) {
    redirect("/login");
  }

  const [
    { data: invitationRows },
    { data: memberRows },
    { data: accessRows },
    { data: connections },
    sessions,
    timeZone,
  ] = await Promise.all([
    supabase
      .from("community_invitations")
      .select(
        "id, label, created_at, expires_at, consumed_at, consumed_by, revoked_at",
      )
      .eq("caregiver_id", caregiverId)
      .order("created_at", { ascending: false }),
    supabase
      .from("community_members")
      .select(
        "student_id, status, joined_at, removed_at, student_profiles(display_name, intro, availability, interests, age_group, guardian_status, student_skills(id, category, title, description))",
      )
      .eq("caregiver_id", caregiverId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("community_learner_access")
      .select("student_id, learner_id")
      .eq("caregiver_id", caregiverId),
    supabase.rpc("get_my_connections"),
    loadSessions(supabase),
    loadTimeZone(supabase, caregiverId),
  ]);

  const mine = sessions.filter((s) => s.caregiver_id === caregiverId);
  const needsYou = mine.filter(
    (s) =>
      s.status === "pending_approval" || s.status === "pending_verification",
  );
  const upcoming = mine.filter(
    (s) => s.status === "invited" || s.status === "scheduled",
  );
  const past = mine
    .filter((s) => !needsYou.includes(s) && !upcoming.includes(s))
    .reverse()
    .slice(0, 10);

  const learners: CommunityLearner[] = (
    (connections as Connection[] | null) ?? []
  )
    .filter((c) => c.partner_role === "care_recipient")
    .map((c) => ({ id: c.partner_id, name: c.partner_full_name || "Learner" }));

  const accessByStudent = new Map<string, string[]>();
  for (const row of accessRows ?? []) {
    const ids = accessByStudent.get(row.student_id) ?? [];
    ids.push(row.learner_id);
    accessByStudent.set(row.student_id, ids);
  }

  const students: CommunityStudent[] = (
    (memberRows as unknown as MemberRow[] | null) ?? []
  ).map((m) => ({
    id: m.student_id,
    status: m.status,
    joined_at: m.joined_at,
    removed_at: m.removed_at,
    display_name: m.student_profiles?.display_name ?? "Student",
    intro: m.student_profiles?.intro ?? "",
    availability: m.student_profiles?.availability ?? "",
    interests: m.student_profiles?.interests ?? "",
    skills: m.student_profiles?.student_skills ?? [],
    learner_ids: accessByStudent.get(m.student_id) ?? [],
    cleared: m.student_profiles ? isCleared(m.student_profiles) : false,
    guardian_status: m.student_profiles?.guardian_status ?? "not_needed",
  }));
  const active = students.filter((s) => s.status === "active");
  const pastStudents = students.filter((s) => s.status === "removed");
  const studentNames = Object.fromEntries(
    students.map((s) => [s.id, s.display_name]),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Community</h1>
        <p className="text-sm text-muted-foreground">
          Invite student volunteers you know and trust to teach the people you
          support. Only students you invite can join, and they only work with
          the people you choose.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Sessions</h2>
          {active.some((s) => s.cleared) && learners.length > 0 && (
            <Button asChild size="sm">
              <Link href="/caregiver/community/sessions/new">
                <IconPlus />
                Plan a session
              </Link>
            </Button>
          )}
        </div>
        {mine.length === 0 && (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No sessions yet. Once a student joins and you choose who they can
              help, you can plan a session here, or they can ask for one.
            </CardContent>
          </Card>
        )}
        {[
          { title: "Needs your attention", list: needsYou },
          { title: "Upcoming", list: upcoming },
          { title: "Recent", list: past },
        ].map(({ title, list }) => (
          <SessionList key={title} title={title} sessions={list}>
            {(s) => (
              <SessionRow
                key={s.id}
                session={s}
                href={`/caregiver/community/sessions/${s.id}`}
                timeZone={timeZone}
                who={`${s.student_name} with ${s.learner_name}`}
                viewer="caregiver"
              />
            )}
          </SessionList>
        ))}
        {mine.length > 0 && (
          <Link
            href="/caregiver/community/history"
            className="w-fit text-sm font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            See all sessions
          </Link>
        )}
      </section>

      <InvitationManager
        invitations={(invitationRows as Invitation[] | null) ?? []}
        studentNames={studentNames}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Your student volunteers
        </h2>
        {active.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {pastStudents.length > 0
                ? "No active student volunteers."
                : "No students yet."}{" "}
              Make an invitation code above and give it to a student you know.
            </CardContent>
          </Card>
        ) : (
          active.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              learners={learners}
            />
          ))
        )}
      </section>

      {pastStudents.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Past volunteers
          </h2>
          <p className="text-sm text-muted-foreground">
            They can't see your family or plan sessions any more. Their past
            service records stay so they keep proof of the time they gave.
          </p>
          {pastStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              learners={learners}
            />
          ))}
        </section>
      )}
    </div>
  );
}
