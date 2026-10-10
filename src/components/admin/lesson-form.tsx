"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  generateMoreQuestions,
  regenerateLesson,
} from "~/app/admin/ai-actions";
import { ReviewPanel } from "~/components/admin/review-panel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { LEVELS, TOPICS, topicLabel, topicOfLesson } from "~/lib/learning-plan";
import { createClient } from "~/lib/supabase/client";
import type {
  ContentStatus,
  Lesson,
  LessonExample,
  LessonLevel,
  PracticeQuestion,
} from "~/lib/types";

// Editor rows carry a local key so React can track them while they're edited.
let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

type ExampleRow = LessonExample & { key: string };
type QuestionRow = PracticeQuestion & { key: string; isNew?: boolean };

const toExampleRows = (examples: LessonExample[]): ExampleRow[] =>
  examples.map((e) => ({ ...e, key: newKey() }));

const toQuestionRows = (
  questions: PracticeQuestion[],
  isNew = false,
): QuestionRow[] => questions.map((q) => ({ ...q, key: newKey(), isNew }));

const emptyQuestion = (): QuestionRow => ({
  key: newKey(),
  question: "",
  choices: ["", "", ""],
  correct_index: 0,
  explanation: "",
});

type SaveMode = "save" | "approve" | "withdraw";

export function LessonForm({ lesson }: { lesson?: Lesson }) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [topic, setTopic] = useState(lesson?.topic ?? "General");
  const [level, setLevel] = useState<LessonLevel>(lesson?.level ?? "beginner");
  const [summary, setSummary] = useState(lesson?.summary ?? "");
  const [body, setBody] = useState(lesson?.body ?? "");
  const [examples, setExamples] = useState<ExampleRow[]>(
    toExampleRows(lesson?.examples ?? []),
  );
  const [takeaways, setTakeaways] = useState(
    (lesson?.key_takeaways ?? []).join("\n"),
  );
  const [questions, setQuestions] = useState<QuestionRow[]>(
    toQuestionRows(lesson?.practice_questions ?? []),
  );
  const [status, setStatus] = useState<ContentStatus>(
    lesson?.status ?? "draft",
  );
  const [sortOrder, setSortOrder] = useState(String(lesson?.sort_order ?? 0));
  const [aiGenerated, setAiGenerated] = useState(lesson?.ai_generated ?? false);
  const [reviewNotes, setReviewNotes] = useState(lesson?.ai_review_notes ?? []);
  const [approvedAt, setApprovedAt] = useState(lesson?.approved_at ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [instructions, setInstructions] = useState("");
  const [aiBusy, setAiBusy] = useState<"regenerate" | "questions" | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const needsApproval = aiGenerated && !approvedAt;
  const matchedTopic = topicOfLesson({ topic, title });
  const takeawayList = takeaways
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  function lessonContext() {
    return {
      title: title.trim(),
      topic: topic.trim(),
      summary: summary.trim(),
      body,
      key_takeaways: takeawayList,
      practice_questions: questions.map(({ key, isNew, ...q }) => q),
    };
  }

  function updateExample(index: number, patch: Partial<LessonExample>) {
    setExamples((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    );
  }

  function updateQuestion(index: number, patch: Partial<QuestionRow>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function updateChoice(qIndex: number, cIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              choices: q.choices.map((c, j) => (j === cIndex ? value : c)),
            }
          : q,
      ),
    );
  }

  function removeChoice(qIndex: number, cIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const choices = q.choices.filter((_, j) => j !== cIndex);
        const correct =
          q.correct_index === cIndex
            ? 0
            : q.correct_index > cIndex
              ? q.correct_index - 1
              : q.correct_index;
        return { ...q, choices, correct_index: correct };
      }),
    );
  }

  async function save(mode: SaveMode) {
    setError(null);

    if (!title.trim()) {
      setError("Please give the lesson a title.");
      return;
    }

    const cleanExamples = examples
      .map((e) => ({
        title: e.title.trim(),
        description: e.description.trim(),
      }))
      .filter((e) => e.title || e.description);
    if (cleanExamples.some((e) => !e.title || !e.description)) {
      setError("Every example needs both a title and a description.");
      return;
    }

    const cleanQuestions: PracticeQuestion[] = [];
    for (const q of questions) {
      const choices = q.choices.map((c) => c.trim());
      if (!q.question.trim() || choices.some((c) => !c)) {
        setError(
          "Every practice question needs the question and all its choices filled in.",
        );
        return;
      }
      if (choices.length < 2) {
        setError("Every practice question needs at least two choices.");
        return;
      }
      cleanQuestions.push({
        question: q.question.trim(),
        choices,
        correct_index: Math.min(q.correct_index, choices.length - 1),
        explanation: q.explanation.trim(),
      });
    }

    const nextApprovedAt =
      mode === "approve"
        ? new Date().toISOString()
        : mode === "withdraw"
          ? null
          : approvedAt;

    if (aiGenerated && status === "published" && !nextApprovedAt) {
      setError("Approve this AI-generated lesson before publishing it.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const values = {
      title: title.trim(),
      topic: topic.trim() || "General",
      level,
      summary: summary.trim(),
      body,
      examples: cleanExamples,
      key_takeaways: takeawayList,
      practice_questions: cleanQuestions,
      status,
      sort_order: Number.parseInt(sortOrder, 10) || 0,
      ai_generated: aiGenerated,
      ai_review_notes: reviewNotes,
      approved_at: nextApprovedAt,
    };

    const { error: saveError } = lesson
      ? await supabase.from("lessons").update(values).eq("id", lesson.id)
      : await supabase.from("lessons").insert(values);

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    if (mode === "save") {
      router.push("/admin/lessons");
      router.refresh();
      return;
    }

    setApprovedAt(nextApprovedAt);
    setQuestions((prev) => prev.map((q) => ({ ...q, isNew: false })));
    router.refresh();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void save("save");
  }

  async function handleRegenerate() {
    setConfirmRegenerate(false);
    setAiError(null);
    setAiMessage(null);
    setAiBusy("regenerate");

    const subject =
      topic.trim() && topic.trim() !== "General" ? topic.trim() : title.trim();
    const result = await regenerateLesson({
      topic: subject,
      instructions: instructions.trim() || undefined,
      current: lessonContext(),
    });
    setAiBusy(null);

    if (!result.ok) {
      setAiError(result.error);
      return;
    }

    const next = result.data;
    setTitle(next.title || title);
    setSummary(next.summary);
    setBody(next.body);
    setExamples(toExampleRows(next.examples));
    setTakeaways(next.key_takeaways.join("\n"));
    setQuestions(toQuestionRows(next.practice_questions));
    setReviewNotes(next.review_notes);
    setAiGenerated(true);
    setApprovedAt(null);
    if (status === "published") {
      setStatus("draft");
    }
    setAiMessage(
      "New version ready below. It isn't saved yet. Review it, then save or approve. Leave this page without saving to keep the previous version.",
    );
  }

  async function handleMoreQuestions() {
    setAiError(null);
    setAiMessage(null);
    setAiBusy("questions");

    const result = await generateMoreQuestions({
      lesson: lessonContext(),
      count: 3,
    });
    setAiBusy(null);

    if (!result.ok) {
      setAiError(result.error);
      return;
    }

    setQuestions((prev) => [...prev, ...toQuestionRows(result.data, true)]);
    setAiMessage(
      `Added ${result.data.length} new question${result.data.length === 1 ? "" : "s"} (marked “New”). Review them, then save to keep them.`,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      {lesson && aiGenerated && (
        <ReviewPanel
          noun="lesson"
          approved={!!approvedAt}
          published={status === "published"}
          notes={reviewNotes}
          busy={saving || aiBusy !== null}
          onApprove={() => void save("approve")}
          onWithdraw={() => void save("withdraw")}
        />
      )}

      {lesson && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h3 className="font-semibold">AI tools</h3>
              <p className="text-sm text-muted-foreground">
                AI writes general education only, never personal financial
                advice. Anything it produces needs your review before learners
                see it.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-instructions">
                Notes for regenerating (optional)
              </Label>
              <Textarea
                id="ai-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Make it shorter and use an example about groceries."
                maxLength={1000}
                className="min-h-16"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {confirmRegenerate ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={aiBusy !== null}
                    onClick={handleRegenerate}
                  >
                    Replace current content
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmRegenerate(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={aiBusy !== null || saving}
                  onClick={() => setConfirmRegenerate(true)}
                >
                  {aiBusy === "regenerate"
                    ? "Regenerating..."
                    : "Regenerate lesson"}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={aiBusy !== null || saving}
                onClick={handleMoreQuestions}
              >
                {aiBusy === "questions"
                  ? "Writing questions..."
                  : "Generate more questions"}
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/scenarios/new?lesson=${lesson.id}`}>
                  Generate practice scenarios
                </Link>
              </Button>
            </div>

            {confirmRegenerate && (
              <p className="text-sm text-muted-foreground">
                This replaces the title, content, examples, takeaways, and
                questions in the form below. Nothing is saved until you save.
              </p>
            )}
            {aiError && <p className="text-sm text-destructive">{aiError}</p>}
            {aiMessage && <p className="text-sm text-primary">{aiMessage}</p>}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Spotting scams"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="topic">Topic</Label>
          <Input
            id="topic"
            list="topic-options"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <datalist id="topic-options">
            {TOPICS.map((t) => (
              <option key={t.id} value={t.lessonTopic} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">
            {matchedTopic
              ? `Recommended to learners who pick “${topicLabel(matchedTopic)}”.`
              : "Doesn't match a learning-plan topic, so it's only recommended by level."}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="level">Level</Label>
          <Select
            id="level"
            value={level}
            onChange={(e) => setLevel(e.target.value as LessonLevel)}
          >
            {LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label} ({l.id})
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Used to match lessons to each learner's knowledge level.
          </p>
        </div>
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="summary">Short summary</Label>
        <Input
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="One sentence shown on the lesson card"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body">Lesson content</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-64"
          placeholder="Write in plain language. Blank lines start a new paragraph."
        />
      </div>

      <div className="flex flex-col gap-3">
        <Label>Examples</Label>
        {examples.map((example, i) => (
          <div
            key={example.key}
            className="flex flex-col gap-2 rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Example {i + 1}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setExamples((prev) => prev.filter((_, j) => j !== i))
                }
              >
                Remove
              </Button>
            </div>
            <Input
              value={example.title}
              onChange={(e) => updateExample(i, { title: e.target.value })}
              placeholder="Short label, e.g. Margaret's monthly budget"
              aria-label={`Example ${i + 1} title`}
            />
            <Textarea
              value={example.description}
              onChange={(e) =>
                updateExample(i, { description: e.target.value })
              }
              placeholder="Walk through the example in a few sentences"
              aria-label={`Example ${i + 1} description`}
              className="min-h-20"
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() =>
            setExamples((prev) => [
              ...prev,
              { key: newKey(), title: "", description: "" },
            ])
          }
        >
          Add example
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="takeaways">Key takeaways</Label>
        <Textarea
          id="takeaways"
          value={takeaways}
          onChange={(e) => setTakeaways(e.target.value)}
          className="min-h-24"
          placeholder="One takeaway per line"
        />
      </div>

      <div className="flex flex-col gap-3">
        <Label>Practice questions</Label>
        {questions.map((q, i) => (
          <div
            key={q.key}
            className="flex flex-col gap-2 rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Question {i + 1}
                </span>
                {q.isNew && <Badge variant="secondary">New</Badge>}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setQuestions((prev) => prev.filter((_, j) => j !== i))
                }
              >
                Remove
              </Button>
            </div>
            <Textarea
              value={q.question}
              onChange={(e) => updateQuestion(i, { question: e.target.value })}
              placeholder="The question learners answer"
              aria-label={`Question ${i + 1}`}
              className="min-h-16"
            />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-xs text-muted-foreground">
                Choices (select the correct answer)
              </legend>
              {q.choices.map((choice, j) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: choices have no stable id while editing
                  key={j}
                  className="flex items-center gap-2"
                >
                  <input
                    type="radio"
                    name={`correct-${q.key}`}
                    checked={q.correct_index === j}
                    onChange={() => updateQuestion(i, { correct_index: j })}
                    aria-label={`Choice ${j + 1} is correct`}
                    className="size-4 accent-primary"
                  />
                  <Input
                    value={choice}
                    onChange={(e) => updateChoice(i, j, e.target.value)}
                    placeholder={`Choice ${j + 1}`}
                    aria-label={`Question ${i + 1} choice ${j + 1}`}
                  />
                  {q.choices.length > 2 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeChoice(i, j)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              {q.choices.length < 6 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-fit"
                  onClick={() =>
                    updateQuestion(i, { choices: [...q.choices, ""] })
                  }
                >
                  Add choice
                </Button>
              )}
            </fieldset>
            <Textarea
              value={q.explanation}
              onChange={(e) =>
                updateQuestion(i, { explanation: e.target.value })
              }
              placeholder="Why the correct answer is right (shown after answering)"
              aria-label={`Question ${i + 1} explanation`}
              className="min-h-16"
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
        >
          Add question
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving || aiBusy !== null}>
          {saving ? "Saving..." : lesson ? "Save changes" : "Create lesson"}
        </Button>
        {lesson && (
          <Button asChild variant="outline">
            <Link href={`/admin/lessons/${lesson.id}/preview`}>
              Preview as learner
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/admin/lessons">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
