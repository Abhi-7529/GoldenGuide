import { redirect } from "next/navigation";
import { AccessibilitySection } from "~/components/landing/accessibility-section";
import { CaregiverSection } from "~/components/landing/caregiver-section";
import { CTA } from "~/components/landing/cta";
import { Features } from "~/components/landing/features";
import { Hero } from "~/components/landing/hero";
import { HowItWorks } from "~/components/landing/how-it-works";
import { OrganizationsSection } from "~/components/landing/organizations-section";
import { Pricing } from "~/components/landing/pricing";
import { Reveal } from "~/components/reveal";
import { createClient } from "~/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { account } = await searchParams;
  // The landing page is for new visitors. Signed-in people go straight to
  // their own home, so nobody is left wondering how to get back to it.
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (claimsData?.claims.sub) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-col">
      {account === "deleted" && (
        <p
          role="status"
          className="mx-auto mt-6 w-[calc(100%-2rem)] max-w-3xl rounded-2xl border border-primary/30 bg-accent p-4 text-center text-lg"
        >
          Your account has been deleted. Thank you for using GoldenGuide.
        </p>
      )}
      <Hero />
      <Reveal>
        <HowItWorks />
      </Reveal>
      <Features />
      <AccessibilitySection />
      <Reveal>
        <CaregiverSection />
      </Reveal>
      <Pricing />
      <Reveal>
        <OrganizationsSection />
      </Reveal>
      <Reveal>
        <CTA />
      </Reveal>
    </main>
  );
}
