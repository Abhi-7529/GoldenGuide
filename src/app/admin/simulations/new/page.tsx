import type { Metadata } from "next";
import { SimulationForm } from "~/components/admin/simulation-form";
import { createClient } from "~/lib/supabase/server";
import type { Lesson } from "~/lib/types";

export const metadata: Metadata = { title: "New scam simulation" };

export default async function NewSimulationPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, title, topic, status")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const lessons =
    (data as Pick<Lesson, "id" | "title" | "topic" | "status">[]) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">New scam simulation</h2>
      <SimulationForm lessons={lessons} />
    </div>
  );
}
