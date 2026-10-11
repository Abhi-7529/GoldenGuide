"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createAiLessonDraft } from "~/app/admin/ai-actions";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export function AiLessonGenerator() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }

    setGenerating(true);
    const result = await createAiLessonDraft({
      topic: topic.trim(),
      instructions: instructions.trim() || undefined,
    });

    if (!result.ok) {
      setGenerating(false);
      setError(result.error);
      return;
    }

    router.push(`/admin/lessons/${result.data.id}`);
  }

  return (
    <Card className="max-w-2xl">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <h3 className="font-semibold">Generate with AI</h3>
            <p className="text-sm text-muted-foreground">
              Enter a financial topic and AI will draft a complete lesson with
              explanations, examples, key takeaways, and practice questions. It
              is saved as a draft for you to review. Nothing is published until
              you approve and publish it.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-topic">Topic</Label>
            <Input
              id="ai-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Recognizing gift card scams"
              maxLength={200}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-instructions">Notes for the AI (optional)</Label>
            <Textarea
              id="ai-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Focus on phone calls pretending to be from a grandchild."
              maxLength={1000}
              className="min-h-20"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={generating} className="w-fit">
            {generating
              ? "Writing lesson... (up to a minute)"
              : "Generate lesson"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
