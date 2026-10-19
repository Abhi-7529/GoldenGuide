import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersTable } from "~/components/admin/users-table";
import { createClient } from "~/lib/supabase/server";
import type { AdminUser } from "~/lib/types";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data } = await supabase.rpc("admin_list_users");

  return (
    <UsersTable
      users={(data as AdminUser[] | null) ?? []}
      currentUserId={userData.user.id}
    />
  );
}
