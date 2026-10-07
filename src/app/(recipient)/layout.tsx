import { redirect } from "next/navigation";
import { RecipientTabs } from "~/components/recipient/tabs";
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
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  if (profile.role !== "care_recipient") {
    redirect("/caregiver");
  }

  const { data: connections } = await supabase.rpc("get_my_connections");
  const connectionId = connections?.[0]?.connection_id ?? null;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col gap-8 px-4 py-8 text-lg sm:px-6 sm:py-10">
      <RecipientTabs connectionId={connectionId} />
      {children}
    </div>
  );
}
