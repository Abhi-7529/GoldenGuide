import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LeaveCommunityButton } from "~/components/student/leave-community-button";
import {
  ProfileForm,
  type StudentProfileFields,
} from "~/components/student/profile-form";
import { Card, CardContent } from "~/components/ui/card";
import type { StudentCommunity } from "~/lib/community";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Volunteer profile" };

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/login");

  const [{ data: profile }, { data: communityData }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("display_name, intro, availability, interests")
      .eq("id", userId)
      .maybeSingle(),
    supabase.rpc("my_student_communities"),
  ]);
  if (!profile) redirect("/onboarding");
  const active = ((communityData as StudentCommunity[] | null) ?? []).filter(
    (c) => c.status === "active",
  );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Volunteer Profile</h1>
        <p className="text-muted-foreground">
          What caregivers in your communities see about you.
        </p>
      </div>

      <Card>
        <CardContent className="py-6">
          <ProfileForm initial={profile as StudentProfileFields} />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Families you volunteer with
        </h2>
        {active.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              None right now. Join a family from your Overview with an
              invitation code.
            </CardContent>
          </Card>
        ) : (
          active.map((c) => (
            <Card key={c.caregiver_id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <span className="font-medium">{c.caregiver_name}'s family</span>
                <LeaveCommunityButton
                  caregiverId={c.caregiver_id}
                  caregiverName={c.caregiver_name}
                />
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
