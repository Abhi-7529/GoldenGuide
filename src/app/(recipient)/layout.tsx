import { redirect } from "next/navigation";
import { RecipientSidebar, RecipientTabs } from "~/components/recipient/tabs";
import { TimeZoneSync } from "~/components/time-zone-sync";
import { homeForRole } from "~/lib/roles";
import { refreshLapsedMemberships } from "~/lib/stripe";
import { createClient } from "~/lib/supabase/server";

export default async function RecipientLayout({
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

  if (profile.role !== "care_recipient") {
    redirect(homeForRole(profile.role));
  }

  const { data: connections } = await supabase.rpc("get_my_connections");
  const connectionId = connections?.[0]?.connection_id ?? null;
  // A caregiver's renewal decides this learner's daily allowance.
  await refreshLapsedMemberships(
    (connections ?? []).map((c: { partner_id: string }) => c.partner_id),
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <RecipientSidebar connectionId={connectionId} />
      <main className="min-w-0 flex-1 px-4 py-8 text-lg sm:px-6 sm:py-10 lg:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <RecipientTabs connectionId={connectionId} />
          <TimeZoneSync saved={profile.time_zone} />
          {children}
        </div>
      </main>
    </div>
  );
}
