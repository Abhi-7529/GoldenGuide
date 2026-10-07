import { redirect } from "next/navigation";
import { ScenarioPlayer } from "~/components/recipient/scenario-player";
import { createClient } from "~/lib/supabase/server";
import type { Scenario } from "~/lib/types";

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("practice_scenarios")
    .select("id, title, prompt, choices")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

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
        scenarios={
          (data as
            | Pick<Scenario, "id" | "title" | "prompt" | "choices">[]
            | null) ?? []
        }
        userId={userId}
      />
    </div>
  );
}
