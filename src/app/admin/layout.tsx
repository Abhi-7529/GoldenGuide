import { notFound, redirect } from "next/navigation";
import { AdminTabs } from "~/components/admin/tabs";
import { createClient } from "~/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage GoldenGuide users, lessons, and practice scenarios.
        </p>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
