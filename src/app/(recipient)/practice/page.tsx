import { redirect } from "next/navigation";
import { ScenarioPlayer } from "~/components/recipient/scenario-player";
import { loadLearnerDay } from "~/lib/membership";
import { createClient } from "~/lib/supabase/server";

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  // Only situations related to the learner's lessons (their caregiver's
  // choices, or today's lessons when learning alone), in recommended order:
  // practice for lessons that felt harder first.
  const day = await loadLearnerDay(supabase, userId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Practice</h1>
        <p className="text-xl">
          Read a real-life money situation. Pick what you would do, and see what
          could happen. This is just practice. No real money is involved.
        </p>
      </div>

      <ScenarioPlayer
        scenarios={day.practice.map((p) => ({ ...p.item, reason: p.reason }))}
        emptyMessage={
          day.waitingForCaregiver
            ? "Practice opens once your caregiver chooses your lessons. Please check back soon."
            : "There are no practice situations for your lessons yet. Try again after your next lesson."
        }
        userId={userId}
      />
    </div>
  );
}
