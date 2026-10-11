import Link from "next/link";
import { redirect } from "next/navigation";
import { TodaysLessons } from "~/components/recipient/todays-lessons";
import { loadLearnerDay } from "~/lib/membership";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";

// Learners only see the lessons they can do: their caregiver's choices, or
// today's lessons from their own plan when learning alone.
export default async function LearnPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const [day, { data: connectionRows }] = await Promise.all([
    loadLearnerDay(supabase, userId),
    supabase.rpc("get_my_connections"),
  ]);
  // A learner has at most one caregiver.
  const caregiver = ((connectionRows as Connection[] | null) ?? [])[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Lessons</h1>
        <p className="text-xl">
          Each lesson is short and goes one step at a time.{" "}
          <Link
            href="/plan"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {day.plan ? "Change my plan" : "Make my plan"}
          </Link>
        </p>
      </div>
      <TodaysLessons
        day={day}
        caregiverName={
          caregiver ? caregiver.partner_full_name || "Your caregiver" : null
        }
      />
    </div>
  );
}
