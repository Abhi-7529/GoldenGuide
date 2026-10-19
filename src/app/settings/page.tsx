import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell, Section } from "~/components/account/account-shell";
import { DeleteAccount } from "~/components/account/delete-account";
import { PreferencesForm } from "~/components/account/preferences-form";
import { SignOutEverywhere } from "~/components/account/sign-out-everywhere";
import { Button } from "~/components/ui/button";
import { loadMembership } from "~/lib/membership";
import { normalizePreferences } from "~/lib/preferences";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, text_size, high_contrast, read_aloud_rate, deletion_scheduled_for",
    )
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  const isCaregiver = profile.role === "caregiver";
  const membership = isCaregiver ? await loadMembership(supabase) : null;
  // A paid Family month that's still running can be used up before deletion.
  const familyUntil =
    membership?.plan === "family" &&
    membership.current_period_end &&
    new Date(membership.current_period_end).getTime() > Date.now()
      ? membership.current_period_end
      : null;

  return (
    <AccountShell
      title="Settings"
      intro="Make GoldenGuide easier to read and hear, and keep your account safe."
    >
      <Section
        title="Reading and listening"
        description="Changes show right away. Save them to keep them every time you sign in."
      >
        <PreferencesForm initial={normalizePreferences(profile)} />
      </Section>

      <Section title="Security">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild variant="outline" size="lg" className="w-fit">
            <Link href="/reset-password">Change my password</Link>
          </Button>
          <SignOutEverywhere />
        </div>
        <p className="text-base text-muted-foreground">
          Signing out on all devices is useful if you used GoldenGuide on a
          shared or lost device.
        </p>
      </Section>

      {isCaregiver && (
        <Section title="Membership">
          <Button asChild variant="outline" size="lg" className="w-fit">
            <Link href="/caregiver/membership">Membership &amp; Billing</Link>
          </Button>
        </Section>
      )}

      <Section
        title="Delete account"
        description="Permanently remove your account and everything in it."
        tone="danger"
      >
        <DeleteAccount
          isCaregiver={isCaregiver}
          familyUntil={familyUntil}
          scheduledFor={profile.deletion_scheduled_for}
        />
      </Section>
    </AccountShell>
  );
}
