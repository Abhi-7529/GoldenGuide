"use client";

import { useRouter } from "next/navigation";
import {
  LearningPlanForm,
  savePlan,
} from "~/components/recipient/learning-plan-form";
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
      mode="learner"
      initial={plan}
      onBack={() => router.push("/home")}
      onSubmit={async (answers) => {
        const error = await savePlan(userId, "learner", answers);
        if (!error) {
          router.push("/home");
          router.refresh();
        }
        return error;
      }}
    />
  );
}
