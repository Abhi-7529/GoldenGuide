"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import {
  goalLabel,
  type LearningPath,
  type LearningPlan,
  levelLabel,
  TOPICS,
  type TopicSuggestion,
  topicLabel,
} from "~/lib/learning-plan";
import { formatDay } from "~/lib/progress";
import { createClient } from "~/lib/supabase/client";

const NOTE_MAX = 200;

/**
 * Shows a learner's plan and lets the caregiver suggest topics. The learner
 * decides whether to add a suggested topic; the caregiver can't change the
 * plan directly.
 */
export function SuggestTopic({
  caregiverId,
  recipientId,
  recipientName,
  plan,
  path,
  suggestions,
}: {
  caregiverId: string;
  recipientId: string;
  recipientName: string;
  plan: LearningPlan | null;
  path: LearningPath;
  suggestions: TopicSuggestion[];
}) {
  const router = useRouter();
  const planTopics = new Set<string>(plan?.topics ?? []);
  const pending = suggestions.filter((s) => !planTopics.has(s.topic));
  const pendingTopics = new Set<string>(pending.map((s) => s.topic));
  const available = TOPICS.filter(
    (t) => !planTopics.has(t.id) && !pendingTopics.has(t.id),
  );
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function suggest(e: FormEvent) {
    e.preventDefault();
    if (!topic) {
      setError("Please choose a topic.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("topic_suggestions")
      .insert({
        caregiver_id: caregiverId,
        care_recipient_id: recipientId,
        topic,
        note: note.trim(),
      });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setTopic("");
    setNote("");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("topic_suggestions")
      .delete()
      .eq("id", id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.refresh();
  }

  const levelNote =
    path.levelChange === "up"
      ? " (moved up because their recent quiz scores were high)"
      : path.levelChange === "down"
        ? " (eased back because recent quizzes felt harder)"
        : "";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div>
        <h3 className="font-semibold">Learning plan</h3>
        <p className="text-sm text-muted-foreground">
          {recipientName} chooses their own plan. You can suggest topics, and
          they decide whether to add them.
        </p>
      </div>

      {plan ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Topics</dt>
            <dd className="font-medium">
              {plan.topics.length
                ? plan.topics.map(topicLabel).join(", ")
                : "None picked yet"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Lesson level</dt>
            <dd className="font-medium">
              {levelLabel(path.level)}
              <span className="font-normal text-muted-foreground">
                {levelNote}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Goals</dt>
            <dd className="font-medium">
              {plan.goals.length
                ? plan.goals.map(goalLabel).join(", ")
                : "None picked yet"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm">
          {recipientName} hasn't made a learning plan yet. Lessons are
          recommended from the beginner level until they do.
        </p>
      )}

      {path.lessons[0] && (
        <p className="text-sm">
          <span className="text-muted-foreground">Recommended next: </span>
          <span className="font-medium">“{path.lessons[0].item.title}”</span>
        </p>
      )}

      {pending.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {pending.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span>
                <span className="font-medium">{topicLabel(s.topic)}</span>{" "}
                <span className="text-muted-foreground">
                  · Suggested {formatDay(s.created_at)}, waiting for{" "}
                  {recipientName}
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => remove(s.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <form onSubmit={suggest} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`topic-${recipientId}`}>Suggest a topic</Label>
              <Select
                id={`topic-${recipientId}`}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="">Choose a topic…</option>
                {available.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`topic-note-${recipientId}`}>
                Short note (optional)
              </Label>
              <Input
                id={`topic-note-${recipientId}`}
                value={note}
                maxLength={NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. I got a scam call last week"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={busy} className="w-fit">
            Suggest topic
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Every topic is already in their plan or suggested.
        </p>
      )}
    </div>
  );
}
