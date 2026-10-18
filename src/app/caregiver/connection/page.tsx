import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConnectionManager } from "~/components/caregiver/connection-manager";
import { loadMembership } from "~/lib/membership";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Manage connection" };

export default async function ManageConnectionPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("invite_code")
    .eq("id", userData.user.id)
    .single();

  const [{ data: connections }, membership] = await Promise.all([
    supabase.rpc("get_my_connections"),
    loadMembership(supabase),
  ]);

  return (
    <ConnectionManager
      inviteCode={profile?.invite_code ?? ""}
      connections={connections ?? []}
      learnerLimit={membership.learner_limit}
      isFamily={membership.plan === "family"}
    />
  );
}
