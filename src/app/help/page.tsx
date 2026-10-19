import type { Metadata } from "next";
import Link from "next/link";
import { IconMessageCircle } from "~/components/icons";
import { PublicPage } from "~/components/public-page";
import { Button } from "~/components/ui/button";

export const metadata: Metadata = {
  title: "Help & Support",
  description:
    "Answers to common questions about GoldenGuide for learners and caregivers.",
};

type Faq = { q: string; a: React.ReactNode };

const linkClass =
  "font-medium text-primary-strong underline underline-offset-4";

const sections: { title: string; faqs: Faq[] }[] = [
  {
    title: "Getting started",
    faqs: [
      {
        q: "What is GoldenGuide?",
        a: "GoldenGuide teaches money basics in short, simple lessons, lets you practice everyday money choices, and helps you learn to spot scams safely. Family caregivers can follow along and help.",
      },
      {
        q: "Is GoldenGuide financial advice?",
        a: "No. GoldenGuide is for learning only. For decisions about your own money, talk with someone you trust or a qualified professional.",
      },
      {
        q: "How do I make the text bigger or easier to read?",
        a: (
          <>
            Open{" "}
            <Link href="/settings" className={linkClass}>
              Settings
            </Link>{" "}
            from the round button at the top right. You can choose a larger text
            size, turn on high contrast, and slow down the &quot;Listen&quot;
            voice. Your choices are saved for every time you sign in.
          </>
        ),
      },
      {
        q: "Can GoldenGuide read lessons out loud?",
        a: 'Yes. Press "Listen" on any lesson page. Press it again to stop.',
      },
    ],
  },
  {
    title: "For learners",
    faqs: [
      {
        q: "How do I connect with my caregiver?",
        a: (
          <>
            Ask your caregiver for their 6-letter invite code. Then go to{" "}
            <Link href="/account" className={linkClass}>
              My Profile
            </Link>{" "}
            and type it in. You can have one caregiver at a time.
          </>
        ),
      },
      {
        q: "What can my caregiver see?",
        a: "Your name, your learning plan, the lessons you finish and your scores, and your practice. They only see a budget if you choose to share it.",
      },
      {
        q: "Will I lose my progress if I remove my caregiver?",
        a: "No. Your finished lessons, progress and budgets stay with you. Your caregiver just stops seeing them.",
      },
      {
        q: "I stopped in the middle of a lesson. Do I start over?",
        a: "No. When you open the lesson again on the same device, it opens where you stopped. You can also choose to start from the beginning.",
      },
      {
        q: "I got a message and I'm not sure if it's a scam.",
        a: 'Use the red "Is this a scam? Get help" button. Never send money, gift cards or codes to someone who contacts you out of the blue.',
      },
    ],
  },
  {
    title: "For caregivers",
    faqs: [
      {
        q: "How do I connect with the person I'm helping?",
        a: (
          <>
            Find your invite code on the{" "}
            <Link href="/caregiver/connection" className={linkClass}>
              Manage Connection
            </Link>{" "}
            page and share it with them. They enter it in GoldenGuide to
            connect.
          </>
        ),
      },
      {
        q: "What's the difference between Free and GoldenGuide Family?",
        a: "On Free, you connect with 1 learner and choose up to 5 lessons for them each day. GoldenGuide Family ($7.99 a month, plus sales tax where it applies) lets you connect with up to 3 learners, with unlimited lessons.",
      },
      {
        q: "How do I upgrade, cancel or see receipts?",
        a: (
          <>
            Go to{" "}
            <Link href="/caregiver/membership" className={linkClass}>
              Membership &amp; Billing
            </Link>
            . If you cancel, you keep Family until the end of the month you paid
            for, and nothing is deleted.
          </>
        ),
      },
      {
        q: "Do learners ever see prices or payments?",
        a: "No. Only caregivers can see or manage memberships.",
      },
    ],
  },
  {
    title: "Your account",
    faqs: [
      {
        q: "I forgot my password.",
        a: (
          <>
            Use{" "}
            <Link href="/forgot-password" className={linkClass}>
              Forgot password
            </Link>{" "}
            and we&apos;ll email you a link to choose a new one. Check your spam
            folder if it doesn&apos;t arrive.
          </>
        ),
      },
      {
        q: "How do I change my name or email?",
        a: (
          <>
            Go to{" "}
            <Link href="/account" className={linkClass}>
              My Profile
            </Link>
            . A new email address needs to be confirmed from the email we send
            you.
          </>
        ),
      },
      {
        q: "How do I delete my account?",
        a: (
          <>
            Go to{" "}
            <Link href="/settings" className={linkClass}>
              Settings
            </Link>{" "}
            and choose &quot;Delete my account&quot;. This removes your account
            and everything in it, and can&apos;t be undone. Caregivers with a
            paid GoldenGuide Family month left can choose to keep using
            GoldenGuide until it ends, and change their mind before then.
          </>
        ),
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <PublicPage
      title="Help & Support"
      intro={
        <p>Answers to common questions. Tap a question to see the answer.</p>
      }
    >
      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold">{section.title}</h2>
          <div className="flex flex-col gap-3">
            {section.faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-border bg-card shadow-card"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-lg font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span
                    aria-hidden="true"
                    className="inline-block text-2xl text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 text-lg leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <section className="flex flex-col items-start gap-4 rounded-2xl border border-primary/30 bg-accent p-6">
        <h2 className="text-2xl font-semibold">Still need help?</h2>
        <p className="text-lg">
          Send us a message and a member of the GoldenGuide team will reply by
          email.
        </p>
        <Button asChild size="xl">
          <Link href="/contact">
            <IconMessageCircle />
            Contact support
          </Link>
        </Button>
      </section>
    </PublicPage>
  );
}
