"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { SimulationFrame } from "~/components/simulation-frame";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { topicOfLesson } from "~/lib/learning-plan";
import { CHANNELS, FICTIONAL_URL, SIMULATION_LEVELS } from "~/lib/simulations";
import { createClient } from "~/lib/supabase/client";
import type {
  ContentStatus,
  Lesson,
  LessonLevel,
  ScamSimulation,
  SimulationChannel,
  SimulationChoice,
} from "~/lib/types";

const emptyChoice: SimulationChoice = { label: "", feedback: "", safe: false };

const SENDER_HINTS: Record<SimulationChannel, string> = {
  text: "Phone number, e.g. (555) 010-0123",
  email: "From line, e.g. Bank <alerts@bank.example>",
  phone: "Caller ID, e.g. Unknown caller",
  website: "Site name shown on the page",
};

const BODY_HINTS: Record<SimulationChannel, string> = {
  text: "The text message",
  email: "The email body",
  phone: "What the caller says. Put each sentence on its own line.",
  website: "What the page says",
};

export function SimulationForm({
  simulation,
  lessons,
}: {
  simulation?: ScamSimulation;
  lessons: Pick<Lesson, "id" | "title" | "topic" | "status">[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(simulation?.title ?? "");
  const [channel, setChannel] = useState<SimulationChannel>(
    simulation?.channel ?? "text",
  );
  const [level, setLevel] = useState<LessonLevel>(
    simulation?.level ?? "beginner",
  );
  const [lessonId, setLessonId] = useState(simulation?.lesson_id ?? "");
  const [situation, setSituation] = useState(simulation?.situation ?? "");
  const [sender, setSender] = useState(simulation?.sender ?? "");
  const [subject, setSubject] = useState(simulation?.subject ?? "");
  const [body, setBody] = useState(simulation?.body ?? "");
  const [displayUrl, setDisplayUrl] = useState(simulation?.display_url ?? "");
  const [choices, setChoices] = useState<SimulationChoice[]>(
    simulation?.choices.length
      ? simulation.choices
      : [
          { ...emptyChoice, safe: true },
          { ...emptyChoice },
          { ...emptyChoice },
        ],
  );
  const [warningSigns, setWarningSigns] = useState<string[]>(
    simulation?.warning_signs.length ? simulation.warning_signs : [""],
  );
  const [safestAction, setSafestAction] = useState(
    simulation?.safest_action ?? "",
  );
  const [status, setStatus] = useState<ContentStatus>(
    simulation?.status ?? "draft",
  );
  const [sortOrder, setSortOrder] = useState(
    String(simulation?.sort_order ?? 0),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Scam lessons first, so the right link is easy to find.
  const lessonOptions = [
    ...lessons.filter((l) => topicOfLesson(l) === "scams"),
    ...lessons.filter((l) => topicOfLesson(l) !== "scams"),
  ];

  function updateChoice(index: number, patch: Partial<SimulationChoice>) {
    setChoices((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const url = displayUrl.trim();
    const signs = warningSigns.map((s) => s.trim()).filter(Boolean);

    if (!title.trim() || !body.trim() || !safestAction.trim()) {
      setError("Please add a title, the message, and the safest action.");
      return;
    }
    if (url && !FICTIONAL_URL.test(url)) {
      setError(
        "Web addresses must be made up and end in .example (for example bank-login.example), so they can never be real.",
      );
      return;
    }
    if (choices.length < 2) {
      setError("Add at least two choices.");
      return;
    }
    if (choices.some((c) => !c.label.trim() || !c.feedback.trim())) {
      setError("Every choice needs both a label and feedback.");
      return;
    }
    if (!choices.some((c) => c.safe)) {
      setError("Mark at least one choice as the safe choice.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const values = {
      title: title.trim(),
      channel,
      level,
      lesson_id: lessonId || null,
      situation: situation.trim(),
      sender: sender.trim(),
      subject: channel === "email" ? subject.trim() : "",
      body: body.trim(),
      display_url: url,
      choices: choices.map((c) => ({
        label: c.label.trim(),
        feedback: c.feedback.trim(),
        safe: c.safe,
      })),
      warning_signs: signs,
      safest_action: safestAction.trim(),
      status,
      sort_order: Number.parseInt(sortOrder, 10) || 0,
    };

    const { error: saveError } = simulation
      ? await supabase
          .from("scam_simulations")
          .update(values)
          .eq("id", simulation.id)
      : await supabase.from("scam_simulations").insert(values);

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    router.push("/admin/simulations");
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Package delivery fee"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channel">Type</Label>
            <Select
              id="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as SimulationChannel)}
            >
              {CHANNELS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="level">Difficulty</Label>
            <Select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value as LessonLevel)}
            >
              {SIMULATION_LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lesson">Goes with lesson</Label>
            <Select
              id="lesson"
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
            >
              <option value="">Any scam lesson</option>
              {lessonOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                  {l.status === "draft" ? " (draft)" : ""}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="situation">Situation</Label>
          <Textarea
            id="situation"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Set the scene, e.g. Your phone buzzes with a text from a number you don't know."
            className="min-h-16"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sender">
              {channel === "email"
                ? "From"
                : channel === "website"
                  ? "Site name"
                  : "Caller ID / number"}
            </Label>
            <Input
              id="sender"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder={SENDER_HINTS[channel]}
            />
          </div>
          {channel === "email" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={BODY_HINTS[channel]}
            className="min-h-32"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="displayUrl">Web address shown (optional)</Label>
          <Input
            id="displayUrl"
            value={displayUrl}
            onChange={(e) => setDisplayUrl(e.target.value)}
            placeholder="e.g. parcel-redelivery.example"
          />
          <p className="text-xs text-muted-foreground">
            Must end in <code>.example</code> so it can never be a real site.
            It's shown as plain text and never opens.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Label>Choices</Label>
          {choices.map((choice, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: choices have no stable id while editing
              key={i}
              className="flex flex-col gap-2 rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between gap-2">
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
                placeholder="What the learner could do"
                aria-label={`Choice ${i + 1} label`}
              />
              <Textarea
                value={choice.feedback}
                onChange={(e) => updateChoice(i, { feedback: e.target.value })}
                placeholder="Feedback: why this is safe or risky"
                aria-label={`Choice ${i + 1} feedback`}
                className="min-h-20"
              />
              <label className="flex w-fit items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={choice.safe}
                  onChange={(e) => updateChoice(i, { safe: e.target.checked })}
                  className="size-4 accent-primary"
                />
                This is the safe choice
              </label>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            disabled={choices.length >= 6}
            onClick={() => setChoices((prev) => [...prev, { ...emptyChoice }])}
          >
            Add choice
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <Label>Warning signs</Label>
          {warningSigns.map((sign, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: signs have no stable id while editing
              key={i}
              className="flex gap-2"
            >
              <Input
                value={sign}
                onChange={(e) =>
                  setWarningSigns((prev) =>
                    prev.map((s, j) => (j === i ? e.target.value : s)),
                  )
                }
                placeholder="e.g. They rush you with a deadline"
                aria-label={`Warning sign ${i + 1}`}
              />
              {warningSigns.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setWarningSigns((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setWarningSigns((prev) => [...prev, ""])}
          >
            Add warning sign
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="safestAction">The safest thing to do</Label>
          <Textarea
            id="safestAction"
            value={safestAction}
            onChange={(e) => setSafestAction(e.target.value)}
            placeholder="e.g. Don't tap the link. Check your package using the tracking number from the shop."
            className="min-h-20"
          />
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
              <option value="published">Published</option>
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
            {saving
              ? "Saving..."
              : simulation
                ? "Save changes"
                : "Create simulation"}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/admin/simulations">Cancel</Link>
          </Button>
        </div>
      </form>

      <aside className="flex flex-col gap-2 lg:sticky lg:top-4 lg:self-start">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Preview
        </p>
        {situation && <p>{situation}</p>}
        <SimulationFrame
          simulation={{
            channel,
            sender,
            subject,
            body: body || "Your message will appear here.",
            display_url: displayUrl.trim(),
          }}
        />
      </aside>
    </div>
  );
}
