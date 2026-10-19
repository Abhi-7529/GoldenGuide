import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BudgetEditor } from "~/components/budget/budget-editor";
import {
  challengeOf,
  isChallenge,
  loadActivitySuggestions,
  loadBudget,
} from "~/lib/budget";
import { createClient } from "~/lib/supabase/server";
import type { Connection } from "~/lib/types";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ challenge?: string; new?: string }>;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [budget, suggestions, { data: connectionRows }] = await Promise.all([
    loadBudget(supabase, id),
    loadActivitySuggestions(supabase, { recipientId: userId }),
    supabase.rpc("get_my_connections"),
  ]);
  // Only the owner edits a budget here.
  if (!budget || budget.user_id !== userId) notFound();

  const connection = ((connectionRows as Connection[] | null) ?? [])[0];
  const caregiver = connection
    ? {
        id: connection.partner_id,
        name: connection.partner_full_name || "your caregiver",
      }
    : null;
  const suggestedChallenges = suggestions
    .filter((s) => !s.done_at)
    .map((s) => s.activity)
    .filter(isChallenge);

  return (
    <div className="flex max-w-3xl flex-col">
      <BudgetEditor
        key={budget.id}
        budget={budget}
        caregiver={caregiver}
        suggestedChallenges={suggestedChallenges}
        startChallenge={challengeOf(query.challenge)?.id ?? null}
        justCreated={query.new === "1"}
      />
    </div>
  );
}
