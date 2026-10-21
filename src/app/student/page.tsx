import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionList, SessionRow } from "~/components/community/session-parts";
import { JoinCommunityForm } from "~/components/student/join-community-form";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  formatHours,
  hasStarted,
  type StudentCommunity,
  summarizeHours,
} from "~/lib/community";
import { loadSessions, loadTimeZone } from "~/lib/community-data";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Volunteer overview" };

export default async function StudentOverviewPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const [{ data: profile }, { data: communityData }, sessions, timeZone] =
    await Promise.all([
      supabase
        .from("student_profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle(),
      supabase.rpc("my_student_communities"),
      loadSessions(supabase),
      loadTimeZone(supabase, userId),
    ]);
  const mine = sessions.filter((s) => s.student_id === userId);
  const hours = summarizeHours(mine);
  const needsYou = mine.filter(
    (s) =>
      s.status === "invited" ||
      s.status === "correction_requested" ||
      (s.status === "scheduled" && hasStarted(s)),
  );
  const comingUp = mine
    .filter(
      (s) =>
        s.status === "pending_approval" ||
        (s.status === "scheduled" && !hasStarted(s)),
    )
    .slice(0, 3);
  const row = (s: (typeof mine)[number]) => (
    <SessionRow
      key={s.id}
      session={s}
      href={`/student/sessions/${s.id}`}
      timeZone={timeZone}
      who={`with ${s.learner_name}`}
      viewer="student"
    />
  );
  const communities = (communityData as StudentCommunity[] | null) ?? [];
  const active = communities.filter((c) => c.status === "active");
  const past = communities.filter((c) => c.status === "removed");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hi{profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Thank you for helping older adults learn. Families you volunteer with
          appear here.
        </p>
      </div>

      <Link
        href="/student/hours"
        className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-border bg-tile-green p-5 text-tile-green-foreground shadow-card transition-colors hover:border-primary/50"
      >
        <span>
          <span className="block text-3xl font-bold text-foreground">
            {formatHours(hours.verifiedMinutes)}
          </span>
          verified volunteer time
        </span>
        {hours.pendingMinutes > 0 && (
          <span className="text-sm">
            {formatHours(hours.pendingMinutes)} waiting for a caregiver
          </span>
        )}
      </Link>

      <SessionList title="Needs your attention" sessions={needsYou}>
        {row}
      </SessionList>
      <SessionList title="Coming up" sessions={comingUp}>
        {row}
      </SessionList>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Your families
        </h2>
        {active.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              You're not part of a family's community right now. Ask a caregiver
              you know for an invitation code.
            </CardContent>
          </Card>
        ) : (
          active.map((c) => (
            <Card key={c.caregiver_id}>
              <CardContent className="flex flex-col gap-2 py-4">
                <p className="font-semibold">{c.caregiver_name}'s family</p>
                <p className="text-sm text-muted-foreground">
                  {c.learners.length === 0
                    ? `${c.caregiver_name} hasn't chosen who you'll help yet.`
                    : `You can help ${c.learners.map((l) => l.name).join(", ")}.`}
                </p>
              </CardContent>
            </Card>
          ))
        )}
        {past.map((c) => (
          <Card key={c.caregiver_id} className="opacity-80">
            <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
              <p className="font-medium">{c.caregiver_name}'s family</p>
              <Badge variant="outline">No longer active</Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent className="flex flex-col gap-3 py-6">
          <div>
            <h2 className="font-semibold">Join another family</h2>
            <p className="text-sm text-muted-foreground">
              If another caregiver gave you an invitation code, enter it here.
            </p>
          </div>
          <JoinCommunityForm />
        </CardContent>
      </Card>
    </div>
  );
}
