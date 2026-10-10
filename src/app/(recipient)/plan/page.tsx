import { redirect } from "next/navigation";
import { EditLearningPlan } from "~/components/recipient/edit-learning-plan";
import { loadPlans } from "~/lib/learning-plan";
import { createClient } from "~/lib/supabase/server";

export default async function LearningPlanPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const plan = (await loadPlans(supabase, [userId])).get(userId) ?? null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">My learning plan</h1>
        <p className="text-xl">
          {plan
            ? "Change your answers any time. We'll pick lessons to match."
            : "Answer three short questions, and we'll pick lessons that suit you."}
        </p>
      </div>
      <EditLearningPlan userId={userId} plan={plan} />
    </div>
  );
}
