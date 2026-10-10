import { redirect } from "next/navigation";
import { ScenarioPlayer } from "~/components/recipient/scenario-player";
import { loadLearnerPath } from "~/lib/learning-plan";
import { createClient } from "~/lib/supabase/server";

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  // Situations come in recommended order: practice for lessons that felt
  // harder first, then the learner's chosen topics, then ones not tried yet.
  const { path } = await loadLearnerPath(supabase, userId);

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
        scenarios={path.practice.map((p) => ({ ...p.item, reason: p.reason }))}
        userId={userId}
      />
    </div>
  );
}
