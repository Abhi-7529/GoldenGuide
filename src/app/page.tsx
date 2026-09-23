import { AboutSection } from "~/components/landing/about-section";
import { CaregiverSection } from "~/components/landing/caregiver-section";
import { CTA } from "~/components/landing/cta";
import { Features } from "~/components/landing/features";
import { Hero } from "~/components/landing/hero";
import { HowItWorks } from "~/components/landing/how-it-works";
import { InteractiveDemo } from "~/components/landing/interactive-demo";
import { ProblemSection } from "~/components/landing/problem-section";
import { TrustSection } from "~/components/landing/trust-section";
import { Reveal } from "~/components/reveal";

export default function Home() {
  return (
    <main className="flex flex-col">
      <Hero />
      <Reveal>
        <ProblemSection />
      </Reveal>
      <Reveal>
        <HowItWorks />
      </Reveal>
      <Reveal>
        <InteractiveDemo />
      </Reveal>
      <Reveal>
        <CaregiverSection />
      </Reveal>
      <Reveal>
        <Features />
      </Reveal>
      <Reveal>
        <AboutSection />
      </Reveal>
      <Reveal>
        <TrustSection />
      </Reveal>
      <Reveal>
        <CTA />
      </Reveal>
    </main>
  );
}
