import type { Metadata } from "next";
import Link from "next/link";
import { LegalContact } from "~/components/legal-contact";
import { Prose, PublicPage } from "~/components/public-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using GoldenGuide, in plain language.",
};

export default function TermsPage() {
  return (
    <PublicPage
      title="Terms of Service"
      intro={<p>Last updated: October 18, 2026</p>}
    >
      <Prose>
        <p>
          These terms explain the rules for using GoldenGuide. GoldenGuide is
          operated by its founder, who is based in Texas, United States
          (&quot;GoldenGuide&quot;, &quot;we&quot; or &quot;us&quot;). By
          creating an account or using GoldenGuide, you agree to these terms and
          to our <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>Education, not financial advice</h2>
        <p>
          GoldenGuide teaches general ideas about money and lets you practice
          with made-up examples. It is not financial, legal or tax advice, and
          it doesn&apos;t tell you what to buy or invest in. For decisions about
          your own money, talk with someone you trust or a qualified
          professional.
        </p>

        <h2>Who can use GoldenGuide</h2>
        <ul>
          <li>You must be 18 or older to create an account.</li>
          <li>
            GoldenGuide accounts and memberships are currently offered only to
            people living in the United States. We don&apos;t offer accounts or
            paid memberships to people in the European Union, the United
            Kingdom, or other places outside the United States at this time.
          </li>
        </ul>

        <h2>Your account</h2>
        <ul>
          <li>
            Please give accurate information and keep your password private.
          </li>
          <li>You&apos;re responsible for what happens in your account.</li>
          <li>
            You can ask us to delete your account at any time, as described in
            our <Link href="/privacy">Privacy Policy</Link>.
          </li>
        </ul>

        <h2>Learners and caregivers</h2>
        <p>
          A learner can connect with one caregiver by entering the
          caregiver&apos;s invite code. Once connected, the caregiver can follow
          the learner&apos;s progress and choose lessons for them, as described
          in our <Link href="/privacy">Privacy Policy</Link>. Either person can
          remove the connection at any time.
        </p>

        <h2>Plans and payment</h2>
        <ul>
          <li>
            <strong>Free:</strong> a caregiver can connect with 1 learner, who
            can finish up to 5 lessons a day. The Budget Calculator and Scam
            Practice are included.
          </li>
          <li>
            <strong>GoldenGuide Family:</strong> $7.99 a month, plus sales tax
            where it applies. A caregiver can connect with up to 3 learners,
            with unlimited lessons. Only caregivers can buy a membership.
          </li>
          <li>
            Family renews automatically every month and is charged to the
            payment method you give at checkout. Payments are handled by Stripe.
          </li>
        </ul>

        <h2>Canceling and refunds</h2>
        <ul>
          <li>
            You can cancel at any time from the Membership page. Canceling stops
            future renewals.
          </li>
          <li>
            You keep Family until the end of the month you&apos;ve already paid
            for. After that, the Free plan&apos;s limits apply again.
          </li>
          <li>
            We generally don&apos;t give refunds for part of a month, except
            where the law requires it or we agree to one. If you think you were
            charged by mistake, <LegalContact />.
          </li>
          <li>
            If a membership ends, nothing is deleted. Progress and connections
            stay.
          </li>
        </ul>

        <h2>Using GoldenGuide fairly</h2>
        <p>
          Please don&apos;t misuse GoldenGuide. That includes trying to get into
          other people&apos;s accounts, interfering with the service, or using
          it to harass anyone. We may suspend or close accounts that do.
        </p>

        <h2>Our content</h2>
        <p>
          Lessons, practice situations and pretend scams belong to GoldenGuide.
          You&apos;re welcome to use them for your own learning. The scams in
          Scam Practice are made up, and their links and phone numbers are not
          real.
        </p>

        <h2>Changes to GoldenGuide and these terms</h2>
        <p>
          We may improve or change GoldenGuide over time. If we make important
          changes to these terms, we&apos;ll update the date at the top of this
          page and, where appropriate, let you know in GoldenGuide.
        </p>

        <h2>Limits of our responsibility</h2>
        <p>
          We work hard to keep GoldenGuide accurate and available, but we
          can&apos;t promise it will always be error-free or uninterrupted.
          GoldenGuide is provided &quot;as is&quot;. To the extent the law
          allows, GoldenGuide isn&apos;t responsible for money decisions you
          make, or for indirect losses. Nothing in these terms limits rights you
          have under consumer protection laws that can&apos;t be waived.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of the State of Texas, United
          States, subject to any consumer protection laws and other legal
          requirements that apply to you.
        </p>

        <h2>Questions</h2>
        <p>
          To ask about these terms, <LegalContact />.
        </p>
      </Prose>
    </PublicPage>
  );
}
