"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ReviewPanel } from "~/components/admin/review-panel";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { createClient } from "~/lib/supabase/client";
import type { ContentStatus, Scenario, ScenarioChoice } from "~/lib/types";

const emptyChoice: ScenarioChoice = { label: "", outcome: "" };

type SaveMode = "save" | "approve" | "withdraw";

export function ScenarioForm({ scenario }: { scenario?: Scenario }) {
  const router = useRouter();
  const [title, setTitle] = useState(scenario?.title ?? "");
  const [prompt, setPrompt] = useState(scenario?.prompt ?? "");
  const [choices, setChoices] = useState<ScenarioChoice[]>(
    scenario?.choices.length
      ? scenario.choices
      : [{ ...emptyChoice }, { ...emptyChoice }],
  );
  const [status, setStatus] = useState<ContentStatus>(
    scenario?.status ?? "draft",
  );
  const [sortOrder, setSortOrder] = useState(String(scenario?.sort_order ?? 0));
  const [approvedAt, setApprovedAt] = useState(scenario?.approved_at ?? null);
  const aiGenerated = scenario?.ai_generated ?? false;
  const needsApproval = aiGenerated && !approvedAt;
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateChoice(index: number, patch: Partial<ScenarioChoice>) {
    setChoices((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  }

  async function save(mode: SaveMode) {
    setError(null);

    if (!title.trim() || !prompt.trim()) {
      setError("Please add a title and the situation learners will read.");
      return;
    }
    if (choices.length < 2) {
      setError("Add at least two choices.");
      return;
    }
    if (choices.some((c) => !c.label.trim() || !c.outcome.trim())) {
      setError("Every choice needs both a label and an outcome.");
      return;
    }

    const nextApprovedAt =
      mode === "approve"
        ? new Date().toISOString()
        : mode === "withdraw"
          ? null
          : approvedAt;

    if (aiGenerated && status === "published" && !nextApprovedAt) {
      setError("Approve this AI-generated scenario before publishing it.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const values = {
      title: title.trim(),
      prompt: prompt.trim(),
      choices: choices.map((c) => ({
        label: c.label.trim(),
        outcome: c.outcome.trim(),
      })),
      status,
      sort_order: Number.parseInt(sortOrder, 10) || 0,
      approved_at: nextApprovedAt,
    };

    const { error: saveError } = scenario
      ? await supabase
          .from("practice_scenarios")
          .update(values)
          .eq("id", scenario.id)
      : await supabase.from("practice_scenarios").insert(values);

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    if (mode === "save") {
      router.push("/admin/scenarios");
      router.refresh();
      return;
    }

    setApprovedAt(nextApprovedAt);
    router.refresh();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void save("save");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      {scenario && aiGenerated && (
        <ReviewPanel
          noun="scenario"
          approved={!!approvedAt}
          published={status === "published"}
          busy={saving}
          onApprove={() => void save("approve")}
          onWithdraw={() => void save("withdraw")}
        />
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Unexpected car repair"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="prompt">Situation</Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the money decision the learner faces."
        />
      </div>

      <div className="flex flex-col gap-3">
        <Label>Choices</Label>
        {choices.map((choice, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: choices have no stable id while editing
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Choice {i + 1}
              </span>
              {choices.length > 2 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setChoices((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  Remove
                </Button>
              )}
            </div>
            <Input
              value={choice.label}
              onChange={(e) => updateChoice(i, { label: e.target.value })}
              placeholder="What the learner can do"
              aria-label={`Choice ${i + 1} label`}
            />
            <Textarea
              value={choice.outcome}
              onChange={(e) => updateChoice(i, { outcome: e.target.value })}
              placeholder="What could happen if they pick this"
              aria-label={`Choice ${i + 1} outcome`}
              className="min-h-20"
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setChoices((prev) => [...prev, { ...emptyChoice }])}
        >
          Add choice
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ContentStatus)}
          >
            <option value="draft">Draft (hidden from learners)</option>
            <option value="published" disabled={needsApproval}>
              {needsApproval ? "Published (approve first)" : "Published"}
            </option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sortOrder">Order</Label>
          <Input
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : scenario ? "Save changes" : "Create scenario"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/scenarios">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
