import { notFound } from "next/navigation";
import { ScenarioForm } from "~/components/admin/scenario-form";
import { createClient } from "~/lib/supabase/server";
import type { Scenario } from "~/lib/types";

export default async function EditScenarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("practice_scenarios")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Edit scenario</h2>
      <ScenarioForm scenario={data as Scenario} />
    </div>
  );
}
