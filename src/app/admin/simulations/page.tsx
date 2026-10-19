import type { Metadata } from "next";
import { ContentList } from "~/components/admin/content-list";
import { channelLabel, levelLabel } from "~/lib/simulations";
import { createClient } from "~/lib/supabase/server";
import type { ScamSimulation } from "~/lib/types";

export const metadata: Metadata = { title: "Scam simulations" };

export default async function AdminSimulationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scam_simulations")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const simulations = (data as ScamSimulation[] | null) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Prewritten pretend scams for Scam Practice. Every simulation must be
        fictional: use made-up names and numbers, and only <code>.example</code>{" "}
        web addresses. Learners can practice as much as they like on any plan.
      </p>
      <ContentList
        table="scam_simulations"
        basePath="/admin/simulations"
        noun="simulation"
        items={simulations.map((s) => ({
          id: s.id,
          title: s.title,
          subtitle: `${channelLabel(s.channel)} · ${levelLabel(s.level)} · ${s.choices.length} choices`,
          status: s.status,
        }))}
      />
    </div>
  );
}
