import type { Metadata } from "next";
import Link from "next/link";
import { StatCard } from "~/components/admin/stat-card";
import { Card, CardContent } from "~/components/ui/card";
import { createClient } from "~/lib/supabase/server";
import type { AdminOverview } from "~/lib/types";

export const metadata: Metadata = { title: "Overview" };

const shortcuts = [
  {
    href: "/admin/users",
    title: "Manage users",
    body: "Search accounts, edit names, grant admin access, or remove a user.",
  },
  {
    href: "/admin/lessons",
    title: "Financial lessons",
    body: "Create, edit, and publish the lessons learners see.",
  },
  {
    href: "/admin/scenarios",
    title: "Practice scenarios",
    body: "Write realistic money decisions with choices and outcomes.",
  },
  {
    href: "/admin/usage",
    title: "Usage statistics",
    body: "Sign-ups, activity, messages, and the most-used content.",
  },
  {
    href: "/admin/inquiries",
    title: "Inquiries",
    body: "Messages sent from the Contact and Organizations pages.",
  },
];

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_overview");
  const o = data as AdminOverview | null;

  if (!o) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Platform information could not be loaded.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Platform
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={o.total_users} />
          <StatCard label="Learners" value={o.learners} />
          <StatCard label="Caregivers" value={o.caregivers} />
          <StatCard
            label="Linked accounts"
            value={o.linked_accounts}
            hint="Caregiver–learner connections"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Setup incomplete"
            value={o.incomplete_signups}
            hint="Signed up, no role chosen yet"
          />
          <StatCard label="Admins" value={o.admins} />
          <StatCard
            label="Published lessons"
            value={o.published_lessons}
            hint={`${o.draft_lessons} draft`}
          />
          <StatCard
            label="Published scenarios"
            value={o.published_scenarios}
            hint={`${o.draft_scenarios} draft`}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Manage</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {shortcuts.map((s) => (
            <Link key={s.href} href={s.href} className="group">
              <Card className="h-full transition-colors group-hover:bg-accent">
                <CardContent className="flex flex-col gap-1">
                  <span className="font-semibold">{s.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {s.body}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
