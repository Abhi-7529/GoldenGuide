import type { Metadata } from "next";
import Link from "next/link";
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
          These terms explain the rules for using GoldenGuide. By creating an
          account, you agree to them.
        </p>

        <h2>Education, not financial advice</h2>
        <p>
          GoldenGuide teaches general ideas about money and lets you practice
          with made-up examples. It is not financial, legal or tax advice, and
          it doesn&apos;t tell you what to buy or invest in. For decisions about
          your own money, talk with someone you trust or a qualified
          professional.
        </p>

        <h2>Your account</h2>
        <ul>
          <li>You must be 18 or older to create an account.</li>
          <li>
            Please give accurate information and keep your password private.
          </li>
          <li>You&apos;re responsible for what happens in your account.</li>
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
            can finish up to 5 lessons a day. Practice and the Budget Calculator
            are included.
          </li>
          <li>
            <strong>
              GoldenGuide Family ($7.99 a month, plus sales tax where it
              applies):
            </strong>{" "}
            a caregiver can connect with up to 3 learners, with unlimited
            lessons. Only caregivers can buy a membership.
          </li>
          <li>
            Family renews every month until you cancel. You can cancel at any
            time from the Membership page, and you keep Family until the end of
            the month you&apos;ve paid for. Payments are handled by Stripe.
          </li>
          <li>
            If a membership ends, nothing is deleted. Progress and connections
            stay, and the Free plan&apos;s limits apply again.
          </li>
        </ul>

        <h2>Using GoldenGuide fairly</h2>
        <p>
          Please don&apos;t misuse GoldenGuide. That includes trying to get into
          other people&apos;s accounts, interfering with the service, or using
          it to harass anyone. We may suspend accounts that do.
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
          page.
        </p>

        <h2>Limits of our responsibility</h2>
        <p>
          We work hard to keep GoldenGuide accurate and available, but we
          can&apos;t promise it will always be error-free or uninterrupted. To
          the extent the law allows, GoldenGuide isn&apos;t responsible for
          money decisions you make.
        </p>

        <h2>Questions</h2>
        <p>
          <Link href="/contact">Send us a message</Link> and we&apos;ll be glad
          to help.
        </p>
      </Prose>
    </PublicPage>
  );
}
