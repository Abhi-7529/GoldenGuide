"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconCheck } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  type TopicId,
  type TopicSuggestion,
  topicLabel,
} from "~/lib/learning-plan";
import { createClient } from "~/lib/supabase/client";

/**
 * A caregiver's topic suggestion. Only the learner can add it to their plan;
 * either answer removes the suggestion.
 */
export function TopicSuggestionCard({
  suggestion,
  caregiverName,
  planTopics,
}: {
  suggestion: TopicSuggestion;
  caregiverName: string;
  planTopics: TopicId[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = topicLabel(suggestion.topic);

  async function answer(add: boolean) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (add) {
      const { error: planError } = await supabase
        .from("learning_preferences")
        .upsert({
          user_id: suggestion.care_recipient_id,
          topics: [...new Set([...planTopics, suggestion.topic])],
        });
      if (planError) {
        setBusy(false);
        setError("Sorry, we couldn't add that. Please try again.");
        return;
      }
    }
    await supabase.from("topic_suggestions").delete().eq("id", suggestion.id);
    setBusy(false);
    router.refresh();
  }

  return (
    <Card className="border-2 border-primary/40 bg-primary/5">
      <CardContent className="flex flex-col gap-4">
        <p className="text-lg font-medium">
          {caregiverName} suggested a topic for you
        </p>
        <p className="text-2xl font-semibold leading-snug">{label}</p>
        {suggestion.note && (
          <p className="text-xl italic">
            “{suggestion.note}” — {caregiverName}
          </p>
        )}
        <p className="text-lg">
          Would you like to add it to your learning plan? It's your choice.
        </p>
        {error && (
          <p role="alert" className="text-lg text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="xl" disabled={busy} onClick={() => answer(true)}>
            <IconCheck />
            Yes, add it
          </Button>
          <Button
            size="xl"
            variant="outline"
            disabled={busy}
            onClick={() => answer(false)}
          >
            No, thank you
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
