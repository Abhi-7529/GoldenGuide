import type { Metadata } from "next";
import {
  type DisputedSession,
  DisputeReview,
} from "~/components/admin/dispute-review";
import { StatCard } from "~/components/admin/stat-card";
import { Card, CardContent } from "~/components/ui/card";
import { formatHours, formatMinutes } from "~/lib/community";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "Community" };

type CommunityStats = {
  students: number;
  students_waiting_for_parent: number;
  active_memberships: number;
  sessions_upcoming: number;
  sessions_awaiting_confirmation: number;
  sessions_verified: number;
  sessions_canceled: number;
  sessions_disputed_open: number;
  verified_minutes: number;
  average_verified_minutes: number;
  sessions_free: number;
  sessions_family: number;
  sessions_over_30_minutes: number;
  verified_by: Partial<Record<"caregiver" | "learner" | "admin", number>>;
  family_caregivers_in_community: number;
  caregivers_in_community: number;
};

// The admin layout already allows owners and staff only, and every RPC
// checks is_admin() again in the database. Session notes are never shown.
export default async function AdminCommunityPage() {
  const supabase = await createClient();
  const [{ data: statsData }, { data: disputedData }] = await Promise.all([
    supabase.rpc("admin_community_stats"),
    supabase.rpc("admin_disputed_sessions"),
  ]);
  const stats = statsData as CommunityStats | null;
  const disputed = (disputedData as DisputedSession[] | null) ?? [];

  if (!stats) {
    return (
      <p className="text-sm text-muted-foreground">
        Community statistics couldn't be loaded.
      </p>
    );
  }

  const total = stats.sessions_free + stats.sessions_family;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Sessions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Upcoming" value={stats.sessions_upcoming} />
          <StatCard
            label="Awaiting confirmation"
            value={stats.sessions_awaiting_confirmation}
          />
          <StatCard
            label="Completed and verified"
            value={stats.sessions_verified}
          />
          <StatCard
            label="Disputes to review"
            value={stats.sessions_disputed_open}
          />
          <StatCard
            label="Verified volunteer time"
            value={formatHours(stats.verified_minutes)}
          />
          <StatCard
            label="Average verified session"
            value={
              stats.average_verified_minutes
                ? formatMinutes(stats.average_verified_minutes)
                : "—"
            }
          />
          <StatCard
            label="Canceled or declined"
            value={stats.sessions_canceled}
          />
          <StatCard
            label="Verified by"
            value={`${stats.verified_by.caregiver ?? 0} / ${stats.verified_by.learner ?? 0} / ${stats.verified_by.admin ?? 0}`}
            hint="Caregiver / learner / review"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Free and Family</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Sessions booked on Free"
            value={stats.sessions_free}
            hint={
              total
                ? `${Math.round((stats.sessions_free / total) * 100)}% of all`
                : undefined
            }
          />
          <StatCard
            label="Sessions booked on Family"
            value={stats.sessions_family}
            hint={
              total
                ? `${Math.round((stats.sessions_family / total) * 100)}% of all`
                : undefined
            }
          />
          <StatCard
            label="Sessions over 30 minutes"
            value={stats.sessions_over_30_minutes}
            hint="Family only"
          />
          <StatCard
            label="Family caregivers using Community"
            value={`${stats.family_caregivers_in_community} of ${stats.caregivers_in_community}`}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Students</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Student volunteers" value={stats.students} />
          <StatCard
            label="Waiting for a parent's approval"
            value={stats.students_waiting_for_parent}
          />
          <StatCard
            label="Active family memberships"
            value={stats.active_memberships}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Disputed sessions</h2>
          <p className="text-sm text-muted-foreground">
            When a learner or caregiver disagrees with logged time. You see the
            facts and history, not the student's session notes.
          </p>
        </div>
        {disputed.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Nothing to review.
            </CardContent>
          </Card>
        ) : (
          disputed.map((s) => <DisputeReview key={s.id} session={s} />)
        )}
      </section>
    </div>
  );
}
