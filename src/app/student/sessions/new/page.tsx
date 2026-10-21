import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SessionForm } from "~/components/community/session-form";
import { BackLink } from "~/components/community/session-parts";
import { Card, CardContent } from "~/components/ui/card";
import type { StudentCommunity } from "~/lib/community";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Ask for a session" };

export default async function NewStudentSessionPage() {
  const supabase = await createClient();
  const { data: communityData } = await supabase.rpc("my_student_communities");
  const families = ((communityData as StudentCommunity[] | null) ?? [])
    .filter((c) => c.status === "active" && c.learners.length > 0)
    .map((c) => ({ caregiverName: c.caregiver_name, learners: c.learners }));

  if (families.length === 0) redirect("/student/sessions");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href="/student/sessions">Back to My Sessions</BackLink>
        <h1 className="text-2xl font-bold tracking-tight">Ask for a session</h1>
        <p className="text-muted-foreground">
          The caregiver approves every session and shares how to join.
        </p>
      </div>
      <Card>
        <CardContent className="py-6">
          <SessionForm
            mode="student"
            families={families}
            sessionsPath="/student/sessions"
          />
        </CardContent>
      </Card>
    </div>
  );
}
