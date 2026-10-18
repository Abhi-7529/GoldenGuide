import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Account Info</h1>
        <p className="text-muted-foreground">
          Your GoldenGuide account details.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Email</span>
          <span className="font-medium">{data.user.email}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Member since</span>
          <span className="font-medium">
            {new Date(data.user.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button asChild size="lg" variant="outline">
          <Link href="/reset-password">Change my password</Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Want to delete your account?{" "}
          <Link href="/contact" className="underline underline-offset-4">
            Contact us
          </Link>{" "}
          and we&apos;ll remove it and everything in it.
        </p>
      </div>
    </main>
  );
}
