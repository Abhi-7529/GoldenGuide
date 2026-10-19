import type { Metadata } from "next";
import Link from "next/link";
import { LegalContact } from "~/components/legal-contact";
import { Prose, PublicPage } from "~/components/public-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What information GoldenGuide keeps, who can see it, how long we keep it, and how to ask us to delete it.",
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
          what we keep, who can see it, how long we keep it, and the choices you
          have.
        </p>

        <h2>Who we are</h2>
        <p>
          GoldenGuide is operated by its founder, Abhiram Bongarala, who is
          based in Texas, United States. When this policy says
          &quot;GoldenGuide&quot;, &quot;we&quot; or &quot;us&quot;, it means
          Abhiram Bongarala as the operator of GoldenGuide. To reach us about
          privacy, <LegalContact />.
        </p>

        <h2>Where GoldenGuide is available</h2>
        <p>
          GoldenGuide accounts and memberships are currently offered only to
          people in the United States. You may be able to visit our public pages
          from elsewhere, but we don&apos;t offer accounts or paid memberships
          to people living in the European Union, the United Kingdom, or other
          places outside the United States at this time.
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
          <li>
            <strong>Basic technical information:</strong> like other websites,
            our hosting provider records technical details such as IP addresses
            and pages requested, to keep the service running and secure.
          </li>
        </ul>

        <h2>How we use it</h2>
        <ul>
          <li>
            To run your account and show your lessons, progress and budgets.
          </li>
          <li>
            To let a learner and their connected caregiver support each other.
          </li>
          <li>To handle memberships and payments for caregivers.</li>
          <li>To answer your questions and messages.</li>
          <li>To keep GoldenGuide safe and fix problems.</li>
          <li>
            To understand, in general, which lessons and features are used, so
            we can improve them.
          </li>
        </ul>
        <p>We do not sell your information, and we do not show ads.</p>

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
          <li>
            <strong>Service providers</strong> handle information only to
            provide their service to us (see below).
          </li>
          <li>
            <strong>When the law requires it,</strong> we may share information
            to comply with a valid legal request, or to protect someone&apos;s
            safety.
          </li>
        </ul>

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

        <h2>How long we keep information</h2>
        <ul>
          <li>We keep your account information while your account is open.</li>
          <li>
            If you ask us to delete your account, we aim to delete or
            de-identify your account information, saved budgets, learning
            progress and messages within 30 days.
          </li>
          <li>
            Copies in our database provider&apos;s backups are removed as those
            backups expire on the provider&apos;s regular schedule.
          </li>
          <li>
            We may keep some information longer when we must for legal, security
            or recordkeeping reasons. Payment records may be kept by GoldenGuide
            or Stripe as tax and accounting laws require.
          </li>
          <li>
            Contact messages are kept while we help you, and deleted when no
            longer needed.
          </li>
        </ul>

        <h2>Keeping your information safe</h2>
        <p>
          Your information is stored securely, and our database checks every
          request so people can only see what they&apos;re allowed to see. No
          system is perfect, so please use a strong password and never share it.
        </p>

        <h2>Your choices and rights</h2>
        <ul>
          <li>You can see and change your learning plan at any time.</li>
          <li>
            You can stop sharing a budget, or remove a caregiver connection.
          </li>
          <li>
            You can ask us for a copy of your information, to correct it, or to
            delete your account and everything in it.
          </li>
          <li>
            Depending on the state you live in, you may have other privacy
            rights. We&apos;ll honor them as the law requires.
          </li>
        </ul>
        <p>
          To make a request, <LegalContact />. We may need to confirm that the
          request comes from you before we act on it.
        </p>

        <h2>Age</h2>
        <p>
          GoldenGuide is meant for adults. You must be 18 or older to sign up,
          and we don&apos;t knowingly collect information from children.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If we make important changes, we&apos;ll update the date at the top of
          this page and, where appropriate, let you know in GoldenGuide.
        </p>

        <h2>Questions</h2>
        <p>
          For any privacy question, <LegalContact />. You can also read our{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </Prose>
    </PublicPage>
  );
}
