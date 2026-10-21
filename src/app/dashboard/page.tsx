import { redirect } from "next/navigation";
import { homeForRole } from "~/lib/roles";
import { createClient } from "~/lib/supabase/server";

// Sends signed-in people to their own dashboard (used by the header logo),
// matching where sign-in takes them.
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  redirect(homeForRole(profile?.role));
}
