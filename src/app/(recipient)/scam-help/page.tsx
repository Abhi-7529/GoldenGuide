import { redirect } from "next/navigation";
import { ScamHelp } from "~/components/recipient/scam-help";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";

export default async function ScamHelpPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: connections } = await supabase.rpc("get_my_connections");
  const caregivers = ((connections as Connection[] | null) ?? [])
    .filter((c) => c.partner_role === "caregiver")
    .map((c) => ({
      connectionId: c.connection_id,
      name: c.partner_full_name || "your caregiver",
    }));

  return <ScamHelp userId={userId} caregivers={caregivers} />;
}
