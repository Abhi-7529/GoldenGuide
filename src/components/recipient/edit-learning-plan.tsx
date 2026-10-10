"use client";

import { useRouter } from "next/navigation";
import { LearningPlanForm } from "~/components/recipient/learning-plan-form";
import type { LearningPlan } from "~/lib/learning-plan";

export function EditLearningPlan({
  userId,
  plan,
}: {
  userId: string;
  plan: LearningPlan | null;
}) {
  const router = useRouter();
  return (
    <LearningPlanForm
      userId={userId}
      mode="learner"
      initial={plan ?? undefined}
      onSaved={() => {
        router.push("/home");
        router.refresh();
      }}
    />
  );
}
