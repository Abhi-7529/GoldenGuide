import type { Metadata } from "next";
import Link from "next/link";
import { Prose, PublicPage } from "~/components/public-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What information GoldenGuide keeps, who can see it, and how to ask us to delete it.",
};

export default function PrivacyPage() {
  return (
    <PublicPage
      title="Privacy Policy"
      intro={<p>Last updated: October 18, 2026</p>}
    >
      <Prose>
        <p>
          GoldenGuide helps older adults learn about money and helps the people
          who care about them follow along. This page explains, in plain words,
          what we keep, who can see it, and the choices you have.
        </p>

        <h2>What we keep</h2>
        <ul>
          <li>
            <strong>Your account:</strong> your email address, your name, and
            whether you joined as a learner or a caregiver. If you sign in with
            Google, Google shares your email address and name with us.
          </li>
          <li>
            <strong>Your learning:</strong> your learning plan answers, which
            lessons you finish and your quiz scores, and the practice situations
            and pretend scams you try.
          </li>
          <li>
            <strong>Budgets you make:</strong> the amounts and labels you type
            into the Budget Calculator.
          </li>
          <li>
            <strong>Messages:</strong> messages between a learner and their
            caregiver, including &quot;Is this a scam?&quot; help requests.
          </li>
          <li>
            <strong>Your time zone:</strong> taken from your device so
            &quot;today&apos;s lessons&quot; follow your own calendar day.
          </li>
          <li>
            <strong>Membership details (caregivers only):</strong> whether you
            have a GoldenGuide Family membership and when it renews. Payment
            card details are handled by Stripe, our payment provider. We never
            see or store your full card number.
          </li>
          <li>
            <strong>Contact messages:</strong> if you use our Contact or
            Organizations form, your name, email and message.
          </li>
        </ul>

        <h2>Who can see your information</h2>
        <ul>
          <li>
            <strong>You</strong> can see everything in your own account.
          </li>
          <li>
            <strong>A caregiver you connect with</strong> can see your name,
            your learning plan, the lessons you finish and your scores, and your
            practice activity. They can only see a budget if you choose to share
            it, and you can stop sharing at any time. If you remove the
            connection, they can no longer see any of this.
          </li>
          <li>
            <strong>The GoldenGuide team</strong> can see account details (like
            names and email addresses) to run the service, answer questions and
            keep it safe.
          </li>
        </ul>
        <p>We do not sell your information, and we do not show ads.</p>

        <h2>Services we use</h2>
        <p>
          We use a small number of trusted companies to run GoldenGuide:
          Supabase (our database and sign-in), Vercel (website hosting), Stripe
          (payments for caregivers), and Google (only if you choose
          &quot;Continue with Google&quot;). They handle information only to
          provide their service to us.
        </p>

        <h2>Cookies and your device</h2>
        <p>
          We use cookies only to keep you signed in. Your browser also remembers
          small settings, like light or dark mode and where you stopped in a
          lesson. We don&apos;t use advertising or tracking cookies.
        </p>

        <h2>Keeping your information safe</h2>
        <p>
          Your information is stored securely, and our database checks every
          request so people can only see what they&apos;re allowed to see. No
          system is perfect, so please use a strong password and never share it.
        </p>

        <h2>Your choices</h2>
        <ul>
          <li>You can change your learning plan at any time.</li>
          <li>
            You can stop sharing a budget, or remove a caregiver connection.
          </li>
          <li>
            You can ask us to delete your account and everything in it by{" "}
            <Link href="/contact">contacting us</Link>.
          </li>
        </ul>

        <h2>Age</h2>
        <p>
          GoldenGuide is meant for adults. You must be 18 or older to sign up.
        </p>

        <h2>Changes and questions</h2>
        <p>
          If we change this policy, we&apos;ll update the date at the top of
          this page. Questions? <Link href="/contact">Send us a message</Link>.
        </p>
      </Prose>
    </PublicPage>
  );
}
