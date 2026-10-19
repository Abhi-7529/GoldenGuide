import Link from "next/link";
import { env } from "~/env";

/** How to reach GoldenGuide about privacy or legal questions. */
export function LegalContact() {
  return env.NEXT_PUBLIC_LEGAL_EMAIL ? (
    <>
      email{" "}
      <a href={`mailto:${env.NEXT_PUBLIC_LEGAL_EMAIL}`}>
        {env.NEXT_PUBLIC_LEGAL_EMAIL}
      </a>{" "}
      or use our <Link href="/contact">Contact form</Link>
    </>
  ) : (
    <>
      use our <Link href="/contact">Contact form</Link>
    </>
  );
}
