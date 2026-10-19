import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "~/components/contact-form";
import { PublicPage } from "~/components/public-page";
import { Card, CardContent } from "~/components/ui/card";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Questions about GoldenGuide? Send the team a message and we'll reply by email.",
};

export default function ContactPage() {
  return (
    <PublicPage
      title="Contact us"
      intro={
        <p>
          Have a question about GoldenGuide, your account, or your membership?
          Send us a message and we&apos;ll reply by email.
        </p>
      }
    >
      <Card>
        <CardContent>
          <ContactForm kind="general" />
        </CardContent>
      </Card>
      <p className="text-lg text-muted-foreground">
        Representing a community group, library, or senior living community?
        Visit{" "}
        <Link
          href="/organizations"
          className="font-medium text-primary-strong underline underline-offset-4"
        >
          GoldenGuide for Organizations
        </Link>
        .
      </p>
    </PublicPage>
  );
}
