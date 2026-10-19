import type { Metadata } from "next";
import { ContactForm } from "~/components/contact-form";
import {
  IconBook,
  IconCheck,
  IconShieldCheck,
  IconUsers,
} from "~/components/icons";
import { PublicPage } from "~/components/public-page";
import { Card, CardContent } from "~/components/ui/card";

export const metadata: Metadata = {
  title: "GoldenGuide for Organizations",
  description:
    "Bring simple, friendly money lessons and scam-awareness practice to the older adults your organization serves.",
};

const available = [
  {
    icon: IconBook,
    title: "Plain-language money lessons",
    text: "Short, step-by-step lessons on budgeting, bills, savings, loans and more, with large text and a Listen button.",
  },
  {
    icon: IconShieldCheck,
    title: "Safe scam practice",
    text: "Pretend texts, emails, calls and websites so people can practice spotting scams without any risk.",
  },
  {
    icon: IconUsers,
    title: "Family caregiver tools",
    text: "Caregivers can follow progress, choose lessons, and send encouragement to the person they support.",
  },
];

const planned = [
  "An organization dashboard to see participation across your members",
  "Group pricing for organizations",
  "Help setting up accounts at in-person sessions",
];

export default function OrganizationsPage() {
  return (
    <PublicPage
      title="GoldenGuide for Organizations"
      intro={
        <p>
          Senior centers, libraries, senior living communities and nonprofits
          can share GoldenGuide with the older adults they serve. Tell us about
          your organization and we&apos;ll talk about how GoldenGuide could
          help.
        </p>
      }
    >
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Available today</h2>
        <p className="text-lg text-muted-foreground">
          Your members and their families can sign up for their own GoldenGuide
          accounts and use everything below right away.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {available.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary-strong">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="text-base text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-muted/50 p-6">
        <h2 className="text-2xl font-semibold">Planned for organizations</h2>
        <p className="text-lg text-muted-foreground">
          These aren&apos;t available yet. We&apos;re building them with input
          from organizations like yours.
        </p>
        <ul className="flex flex-col gap-2 text-lg">
          {planned.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <IconCheck className="mt-1 size-5 shrink-0 text-muted-foreground" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Get in touch</h2>
        <Card>
          <CardContent>
            <ContactForm kind="organization" />
          </CardContent>
        </Card>
      </section>
    </PublicPage>
  );
}
