import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell, Section } from "~/components/account/account-shell";
import { CaregiverConnection } from "~/components/account/caregiver-connection";
import { EmailForm } from "~/components/account/email-form";
import { NameForm } from "~/components/account/name-form";
import { Avatar } from "~/components/account-menu";
import { ConnectCaregiverCard } from "~/components/recipient/connect-caregiver-card";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";

export const metadata: Metadata = { title: "My Profile" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  const isLearner = profile.role === "care_recipient";
  const { data: connectionRows } = isLearner
    ? await supabase.rpc("get_my_connections")
    : { data: null };
  const caregiver = ((connectionRows as Connection[] | null) ?? [])[0];
  const email = data.user.email ?? "";
  // Google-only accounts don't have a password yet; this lets them set one.
  const hasPassword = data.user.identities?.some((i) => i.provider === "email");

  return (
    <AccountShell
      title="My Profile"
      intro="Your name, email and password. Only you can change these."
    >
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <Avatar
          account={{ email, fullName: profile.full_name }}
          className="size-16 text-xl"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-xl font-semibold">
            {profile.full_name || email}
          </p>
          <p className="text-base text-muted-foreground">
            {isLearner ? "Learner" : "Caregiver"} · Member since{" "}
            {new Date(data.user.created_at).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <Section title="Personal information">
        <NameForm initialName={profile.full_name} />
        <EmailForm currentEmail={email} />
      </Section>

      <Section
        title="Password"
        description={
          hasPassword
            ? "Choose a new password for signing in."
            : "You sign in with Google. You can also set a password to sign in with your email."
        }
      >
        <Button asChild size="lg" variant="outline" className="w-fit">
          <Link href="/reset-password">
            {hasPassword ? "Change my password" : "Set a password"}
          </Link>
        </Button>
      </Section>

      {isLearner ? (
        caregiver ? (
          <Section title="Your caregiver">
            <CaregiverConnection
              connectionId={caregiver.connection_id}
              caregiverName={caregiver.partner_full_name || "Your caregiver"}
            />
          </Section>
        ) : (
          <ConnectCaregiverCard />
        )
      ) : (
        <Section
          title="People you support"
          description="Share your invite code, or see and remove connections."
        >
          <Button asChild size="lg" variant="outline" className="w-fit">
            <Link href="/caregiver/connection">Manage connections</Link>
          </Button>
        </Section>
      )}

      <p className="text-base text-muted-foreground">
        Text size, contrast and account deletion are in{" "}
        <Link
          href="/settings"
          className="font-medium text-primary-strong underline underline-offset-4"
        >
          Settings
        </Link>
        .
      </p>
    </AccountShell>
  );
}
