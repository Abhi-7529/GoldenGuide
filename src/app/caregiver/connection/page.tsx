import { redirect } from "next/navigation";
import { ConnectionManager } from "~/components/caregiver/connection-manager";
import { createClient } from "~/lib/supabase/server";

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

  const { data: connections } = await supabase.rpc("get_my_connections");

  return (
    <ConnectionManager
      inviteCode={profile?.invite_code ?? ""}
      connections={connections ?? []}
    />
  );
}
