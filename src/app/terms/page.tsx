import type { Metadata } from "next";
import Link from "next/link";
import { LegalContact } from "~/components/legal-contact";
import { Prose, PublicPage } from "~/components/public-page";
import { env } from "~/env";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using GoldenGuide, in plain language.",
};

export default function TermsPage() {
  // Student volunteer terms show once Community Skill Exchange is switched on.
  const community = env.NEXT_PUBLIC_COMMUNITY_ENABLED;

  return (
    <PublicPage
      title="Terms of Service"
      intro={
        <p>
          Last updated: {community ? "October 21, 2026" : "October 19, 2026"}
        </p>
      }
    >
      <Prose>
        <p>
          These terms explain the rules for using GoldenGuide. GoldenGuide is
          operated by Sriabhiram Bongarala, an individual based in Texas, United
          States (&quot;GoldenGuide&quot;, &quot;we&quot; or &quot;us&quot;). By
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
          <li>
            {community
              ? "You must be 18 or older to create an account. The one exception is student volunteers aged 16 or 17, who can join Community Skill Exchange with a parent or guardian's approval (see below)."
              : "You must be 18 or older to create an account."}
          </li>
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

        {community && (
          <>
            <h2>Community Skill Exchange (student volunteers)</h2>
            <p>
              Community Skill Exchange lets caregivers invite student volunteers
              they know to help the people they support learn everyday skills.
              These rules apply to everyone who uses it.
            </p>
            <ul>
              <li>
                <strong>Private, by invitation only.</strong> A student can only
                join a family by redeeming a single-use code from that
                family&apos;s caregiver. There is no public directory, and
                students can&apos;t search for or contact families on their own.
              </li>
              <li>
                <strong>Who can volunteer.</strong> Student volunteers must be
                16 or older. Students aged 16 or 17 need a parent or
                guardian&apos;s approval, which we ask for by email, before they
                can work with any family.
              </li>
              <li>
                <strong>Caregivers are in charge.</strong> The caregiver decides
                which family member a student may help, and approves every
                session. Learners can always say &quot;not this time&quot;, and
                caregivers can remove a student at any time.
              </li>
              <li>
                <strong>Remote sessions only.</strong> Sessions happen by video
                or phone call. Please don&apos;t meet in person or visit
                anyone&apos;s home through GoldenGuide.
              </li>
              <li>
                <strong>Keep money and private details private.</strong>{" "}
                Students must never ask for, or accept, money, gifts, passwords,
                bank or card details, or other private information from the
                people they help. Learners should never share them. If anyone
                asks, stop and tell the caregiver.
              </li>
              <li>
                <strong>We don&apos;t screen volunteers.</strong> GoldenGuide
                doesn&apos;t run background checks. Caregivers choose whom to
                invite and are responsible for supervising sessions with their
                family members.
              </li>
              <li>
                <strong>Volunteer hours.</strong> Students record the time they
                give, and the family&apos;s caregiver confirms it. A GoldenGuide
                service record documents those activities. It is the
                caregiver&apos;s confirmation, not a certification by
                GoldenGuide, and each school or organization decides whether to
                accept the hours. Volunteers aren&apos;t paid and aren&apos;t
                employees of GoldenGuide or of the families they help.
              </li>
              <li>
                <strong>Concerns.</strong> If something feels wrong, end the
                session and <LegalContact />. We may remove students or close
                communities that break these rules.
              </li>
            </ul>
          </>
        )}

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
