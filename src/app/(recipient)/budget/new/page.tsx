import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BudgetSetup } from "~/components/budget/budget-setup";
import { IconArrowLeft } from "~/components/icons";
import { TEMPLATES } from "~/lib/budget";
import { createClient } from "~/lib/supabase/server";

export const metadata: Metadata = { title: "New budget" };

export default async function NewBudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const params = await searchParams;
  const template = TEMPLATES.find((t) => t.id === params.template)?.id ?? null;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/budget"
          className="flex w-fit items-center gap-2 text-lg font-medium underline decoration-primary decoration-2 underline-offset-4"
        >
          <IconArrowLeft className="size-5" />
          Back to my budgets
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Make a budget</h1>
        <p className="text-xl">
          We'll go one step at a time. Nothing is saved until the last step.
        </p>
      </div>
      <BudgetSetup userId={userId} initialTemplate={template} />
    </div>
  );
}
