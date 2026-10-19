import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SimulationForm } from "~/components/admin/simulation-form";
import { createClient } from "~/lib/supabase/server";
import type { Lesson, ScamSimulation } from "~/lib/types";

export const metadata: Metadata = { title: "Edit scam simulation" };

export default async function EditSimulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: lessonRows }] = await Promise.all([
    supabase.from("scam_simulations").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("lessons")
      .select("id, title, topic, status")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (!data) {
    notFound();
  }

  const lessons =
    (lessonRows as Pick<Lesson, "id" | "title" | "topic" | "status">[]) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Edit scam simulation</h2>
      <SimulationForm simulation={data as ScamSimulation} lessons={lessons} />
    </div>
  );
}
