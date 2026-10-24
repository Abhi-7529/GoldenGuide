import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SessionForm } from "~/components/community/session-form";
import { BackLink } from "~/components/community/session-parts";
import { Card, CardContent } from "~/components/ui/card";
import { env } from "~/env";
import { formatMinutes, isCleared, PLANNED_MINUTES } from "~/lib/community";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";

export const metadata: Metadata = { title: "Plan a session" };

export default async function NewCaregiverSessionPage() {
  if (!env.NEXT_PUBLIC_COMMUNITY_ENABLED) notFound();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const caregiverId = claimsData?.claims.sub;
  if (!caregiverId) redirect("/login");

  const [{ data: memberRows }, { data: connections }, { data: maxData }] =
    await Promise.all([
      supabase
        .from("community_members")
        .select(
          "student_id, student_profiles(display_name, age_group, guardian_status)",
        )
        .eq("caregiver_id", caregiverId)
        .eq("status", "active")
        .order("joined_at", { ascending: true }),
      supabase.rpc("get_my_connections"),
      supabase.rpc("my_max_session_minutes"),
    ]);
  const maxMinutes = (maxData as number | null) ?? PLANNED_MINUTES;

  const students = (
    (memberRows as unknown as
      | {
          student_id: string;
          student_profiles: {
            display_name: string;
            age_group: string | null;
            guardian_status: string;
          } | null;
        }[]
      | null) ?? []
  )
    // Students waiting for a parent's approval can't be in sessions yet.
    .filter((m) => m.student_profiles && isCleared(m.student_profiles))
    .map((m) => ({
      id: m.student_id,
      name: m.student_profiles?.display_name ?? "Student",
    }));
  const learners = ((connections as Connection[] | null) ?? [])
    .filter((c) => c.partner_role === "care_recipient")
    .map((c) => ({ id: c.partner_id, name: c.partner_full_name || "Learner" }));

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href="/caregiver/community">Back to Community</BackLink>
        <h1 className="text-xl font-semibold">Plan a session</h1>
        <p className="text-sm text-muted-foreground">
          Choose who will learn together, when, and for how long (up to{" "}
          {formatMinutes(maxMinutes)} on your plan). The real time given is
          recorded afterwards.
        </p>
      </div>

      {students.length === 0 || learners.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {students.length === 0
              ? "Invite a student volunteer first, from the Community page. Students under 18 also need a parent or guardian's approval."
              : "Connect with the person you support first, from Manage Connection."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            <SessionForm
              mode="caregiver"
              maxMinutes={maxMinutes}
              students={students}
              learners={learners}
              sessionsPath="/caregiver/community/sessions"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
