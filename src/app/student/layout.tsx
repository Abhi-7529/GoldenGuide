import { redirect } from "next/navigation";
import { StudentSidebar, StudentTabs } from "~/components/student/tabs";
import { TimeZoneSync } from "~/components/time-zone-sync";
import { homeForRole } from "~/lib/roles";
import { createClient } from "~/lib/supabase/server";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, time_zone")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  if (profile.role !== "student") {
    redirect(homeForRole(profile.role));
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <StudentSidebar />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <StudentTabs />
          <TimeZoneSync saved={profile.time_zone} />
          {children}
        </div>
      </main>
    </div>
  );
}
