import type { Metadata } from "next";
import { ContentList } from "~/components/admin/content-list";
import { createClient } from "~/lib/supabase/server";
import type { Scenario } from "~/lib/types";

export const metadata: Metadata = { title: "Scenarios" };

export default async function AdminScenariosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("practice_scenarios")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const scenarios = (data as Scenario[] | null) ?? [];

  return (
    <ContentList
      table="practice_scenarios"
      basePath="/admin/scenarios"
      noun="scenario"
      items={scenarios.map((s) => ({
        id: s.id,
        title: s.title,
        subtitle: `${s.choices.length} choices · ${s.prompt}`,
        status: s.status,
        aiGenerated: s.ai_generated,
        needsReview: s.ai_generated && !s.approved_at,
      }))}
    />
  );
}
