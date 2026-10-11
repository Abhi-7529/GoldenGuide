import { redirect } from "next/navigation";
import { CaregiverTabs } from "~/components/caregiver/tabs";
import { TimeZoneSync } from "~/components/time-zone-sync";
import { refreshLapsedMemberships } from "~/lib/stripe";
import { createClient } from "~/lib/supabase/server";

export default async function CaregiverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, time_zone")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  if (profile.role !== "caregiver") {
    redirect("/home");
  }

  await refreshLapsedMemberships([userData.user.id]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col gap-6 px-6 py-10">
      <CaregiverTabs />
      <TimeZoneSync saved={profile.time_zone} />
      {children}
    </div>
  );
}
