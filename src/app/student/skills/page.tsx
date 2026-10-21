import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SkillsManager } from "~/components/student/skills-manager";
import type { StudentSkill } from "~/lib/community";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "My skills" };

export default async function StudentSkillsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/login");

  const { data } = await supabase
    .from("student_skills")
    .select("id, category, title, description")
    .eq("student_id", userId)
    .order("created_at", { ascending: true });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Skills</h1>
        <p className="text-muted-foreground">
          What you can teach. Only caregivers in your communities see this.
        </p>
      </div>
      <SkillsManager
        studentId={userId}
        skills={(data as StudentSkill[] | null) ?? []}
      />
    </div>
  );
}
