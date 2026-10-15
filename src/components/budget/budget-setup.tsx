"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BudgetLines } from "~/components/budget/budget-lines";
import { BudgetSummary } from "~/components/budget/budget-summary";
import { MoneyInput } from "~/components/budget/money-input";
import { Term } from "~/components/budget/term";
import { IconArrowLeft, IconArrowRight, IconCheck } from "~/components/icons";
import { Button } from "~/components/ui/button";
import {
  type BudgetDraft,
  draftFromTemplate,
  EXAMPLE_TEMPLATES,
  formatMoney,
  isOwnBudget,
  kindOf,
  NAME_MAX,
  summarize,
} from "~/lib/budget";
import { createClient } from "~/lib/supabase/client";
import type { BudgetLine, BudgetTemplateId } from "~/lib/types";
import { cn } from "~/lib/utils";

const STEPS = [
  "How to start",
  "Money coming in",
  "Needs",
  "Wants and saving",
  "Savings goal",
  "Name and save",
] as const;

/**
 * Puts the edited part of a list (the lines shown on one step) back into the
 * whole list: keeps the order, drops removed lines, and adds new ones last.
 */
function mergeLines(
  all: BudgetLine[],
  shown: BudgetLine[],
  edited: BudgetLine[],
) {
  const shownIds = new Set(shown.map((l) => l.id));
  const byId = new Map(edited.map((l) => [l.id, l]));
  const allIds = new Set(all.map((l) => l.id));
  return [
    ...all
      .filter((l) => !shownIds.has(l.id) || byId.has(l.id))
      .map((l) => byId.get(l.id) ?? l),
    ...edited.filter((l) => !allIds.has(l.id)),
  ];
}

const unnamed = (lines: BudgetLine[]) => lines.some((l) => !l.label.trim());

/**
 * Sets up a budget one small step at a time: start from your own numbers or
 * a made-up example, then income, needs, wants, a savings goal, and a name.
 */
export function BudgetSetup({
  userId,
  initialTemplate,
}: {
  userId: string;
  initialTemplate: BudgetTemplateId | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialTemplate ? 1 : 0);
  const [draft, setDraft] = useState<BudgetDraft>(() =>
    draftFromTemplate(initialTemplate ?? "retirement"),
  );
  const [chosen, setChosen] = useState<BudgetTemplateId | null>(
    initialTemplate,
  );
  const [showExamples, setShowExamples] = useState(
    !!initialTemplate && !isOwnBudget(initialTemplate),
  );
  const own = isOwnBudget(draft.template);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [goalInvalid, setGoalInvalid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const totals = summarize(draft);
  const needs = draft.expenses.filter((l) => kindOf(l) === "need");
  const wants = draft.expenses.filter((l) => kindOf(l) !== "need");

  // Move focus to the new step's heading so keyboard and screen reader users
  // start at the top of it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the step changes
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function markInvalid(id: string, bad: boolean) {
    setInvalid((prev) => {
      const next = new Set(prev);
      if (bad) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function choose(id: BudgetTemplateId) {
    if (id !== chosen) {
      setDraft(draftFromTemplate(id));
      setInvalid(new Set());
      setChosen(id);
    }
    setStep(1);
  }

  const stepMissingNames =
    (step === 1 && unnamed(draft.income)) || (step === 3 && unnamed(wants));
  const stepHasErrors =
    stepMissingNames ||
    (step === 1 && draft.income.some((l) => invalid.has(l.id))) ||
    (step === 2 && needs.some((l) => invalid.has(l.id))) ||
    (step === 3 && wants.some((l) => invalid.has(l.id))) ||
    (step === 4 && goalInvalid);
  const nameMissing = !draft.name.trim();

  async function save() {
    if (nameMissing) {
      setError("Please give your budget a name.");
      return;
    }
    if (invalid.size > 0 || goalInvalid) {
      setError("Please go back and fix the amounts marked in red.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("practice_budgets")
      .insert({
        user_id: userId,
        name: draft.name.trim(),
        template: draft.template,
        period: draft.period,
        mode: draft.mode,
        income: draft.income.map((l) => ({ ...l, label: l.label.trim() })),
        expenses: draft.expenses.map((l) => ({ ...l, label: l.label.trim() })),
        savings_goal: draft.savings_goal,
      })
      .select("id")
      .single();
    if (insertError || !data) {
      setSaving(false);
      setError("Sorry, we couldn't save your budget. Please try again.");
      return;
    }
    // Marks any matching caregiver suggestions as done; fine if there are none.
    await supabase.rpc("finish_budget_activity", {
      p_activity: "first_budget",
    });
    if (draft.savings_goal > 0) {
      await supabase.rpc("finish_budget_activity", {
        p_activity: "savings_goal",
      });
    }
    router.push(`/budget/${data.id}?new=1`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-lg font-medium text-muted-foreground">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-valuetext={`Step ${step + 1} of ${STEPS.length}`}
          className="h-3 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {step === 0 && (
        <section className="flex flex-col gap-4">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold outline-none"
          >
            How would you like to start?
          </h2>
          <p className="text-xl">
            You can plan with your own money, or practice first with made-up
            numbers. Either way, you can change any amount later.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => choose("blank")}
              aria-pressed={chosen === "blank"}
              className={cn(
                "flex min-h-16 flex-col gap-2 rounded-xl border-2 p-5 text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/50",
                chosen === "blank"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary hover:bg-accent",
              )}
            >
              <span className="flex items-center gap-2 text-2xl font-semibold">
                {chosen === "blank" && <IconCheck className="size-6" />}
                Use my own numbers
              </span>
              <span className="text-lg">
                Plan your real money. Every amount starts at $0 for you to fill
                in.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowExamples(true)}
              aria-expanded={showExamples}
              aria-controls="budget-examples"
              className={cn(
                "flex min-h-16 flex-col gap-2 rounded-xl border-2 p-5 text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/50",
                showExamples
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary hover:bg-accent",
              )}
            >
              <span className="text-2xl font-semibold">
                Try a made-up example
              </span>
              <span className="text-lg">
                Practice with pretend people and numbers first.
              </span>
            </button>
          </div>

          {showExamples && (
            <div id="budget-examples" className="flex flex-col gap-3">
              <p className="text-xl font-semibold">Choose an example</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {EXAMPLE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => choose(t.id)}
                    aria-pressed={chosen === t.id}
                    className={cn(
                      "flex min-h-16 flex-col gap-2 rounded-xl border-2 p-4 text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/50",
                      chosen === t.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary hover:bg-accent",
                    )}
                  >
                    <span className="flex items-center gap-2 text-xl font-semibold">
                      {chosen === t.id && <IconCheck className="size-6" />}
                      {t.label}
                    </span>
                    <span className="text-lg">{t.description}</span>
                    <span className="text-lg text-muted-foreground">
                      {t.example}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-lg text-muted-foreground">
            You'll never need bank account numbers, card numbers, or passwords
            here. Rounded amounts are fine.
          </p>
          <Term id="budget" />
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-4">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold outline-none"
          >
            How much money comes in each month?
          </h2>
          <p className="text-xl">
            {own
              ? "Type in what you get each month, like a Social Security check or pension. "
              : "These are the example's made-up amounts. Change them if you like. "}
            Most bills come once a month, so we start with monthly amounts. You
            can see weekly or yearly amounts later.
          </p>
          <Term id="income" />
          <BudgetLines
            kind="income"
            lines={draft.income}
            onChange={(income) => setDraft({ ...draft, income })}
            onInvalid={markInvalid}
            period="monthly"
            mode="simple"
            sliderHint={5000}
            canAdd
          />
          <p className="text-xl font-semibold">
            Total coming in: {formatMoney(totals.income)} a month
          </p>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-4">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold outline-none"
          >
            Your needs
          </h2>
          <p className="text-xl">
            These are the things most people must pay for each month.
          </p>
          <Term id="needsWants" />
          <BudgetLines
            kind="expense"
            lines={needs}
            onChange={(edited) =>
              setDraft({
                ...draft,
                expenses: mergeLines(draft.expenses, needs, edited),
              })
            }
            onInvalid={markInvalid}
            period="monthly"
            mode="simple"
            sliderHint={totals.income}
          />
          <p className="text-xl font-semibold">
            Needs so far: {formatMoney(totals.needs)} of{" "}
            {formatMoney(totals.income)} coming in
          </p>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-4">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold outline-none"
          >
            Wants and saving
          </h2>
          <p className="text-xl">
            Wants make life enjoyable. Saving is money you put aside for later.
          </p>
          <p className="text-lg text-muted-foreground">
            Have another cost, like pet care or gifts? Press “Add an expense”
            below to add it.
          </p>
          <BudgetLines
            kind="expense"
            lines={wants}
            onChange={(edited) =>
              setDraft({
                ...draft,
                expenses: mergeLines(draft.expenses, wants, edited),
              })
            }
            onInvalid={markInvalid}
            period="monthly"
            mode="simple"
            sliderHint={totals.income}
            canAdd
          />
          <p className="text-xl font-semibold">
            {totals.remaining >= 0
              ? `Left over so far: ${formatMoney(totals.remaining)} a month`
              : `So far you're ${formatMoney(-totals.remaining)} short each month`}
          </p>
        </section>
      )}

      {step === 4 && (
        <section className="flex flex-col gap-4">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold outline-none"
          >
            Choose a savings goal
          </h2>
          <p className="text-xl">
            How much would you like to save each month? We'll show how close
            your budget comes. You can leave this at $0 to skip it.
          </p>
          <Term id="savingsGoal" />
          <Term id="emergencyFund" />
          <div className="rounded-xl border-2 border-border bg-card p-4">
            <MoneyInput
              label="My savings goal"
              help={`You're putting aside ${formatMoney(totals.savings)} a month right now.`}
              value={draft.savings_goal}
              period="monthly"
              sliderHint={Math.max(totals.income / 4, 500)}
              onChange={(v) => {
                setGoalInvalid(v === null);
                if (v !== null) setDraft({ ...draft, savings_goal: v });
              }}
            />
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="flex flex-col gap-5">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold outline-none"
          >
            {own ? "Here's your budget" : "Here's your practice budget"}
          </h2>
          <BudgetSummary
            totals={totals}
            period="monthly"
            savingsGoal={draft.savings_goal}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="budget-name" className="text-xl font-semibold">
              Give it a name
            </label>
            <input
              id="budget-name"
              value={draft.name}
              maxLength={NAME_MAX}
              aria-invalid={nameMissing || undefined}
              aria-describedby={nameMissing ? "budget-name-error" : undefined}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="h-14 w-full rounded-lg border-2 border-input bg-background px-3 text-xl outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/40 aria-invalid:border-destructive dark:bg-input/30"
            />
            {nameMissing && (
              <p
                id="budget-name-error"
                className="text-lg font-medium text-destructive"
              >
                Please give your budget a name.
              </p>
            )}
          </div>
          <p className="text-lg text-muted-foreground">
            Your budgets are private. Only you can see them unless you choose to
            share one with your caregiver.
          </p>
        </section>
      )}

      {error && (
        <p role="alert" className="text-xl font-medium text-destructive">
          {error}
        </p>
      )}
      {stepHasErrors && (
        <p className="text-xl font-medium text-destructive">
          {stepMissingNames
            ? "Please give each new line a name to go on."
            : "Please fix the amounts marked in red to go on."}
        </p>
      )}

      {step > 0 && (
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
          <Button
            type="button"
            size="xl"
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={saving}
          >
            <IconArrowLeft />
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              size="xl"
              onClick={() => setStep(step + 1)}
              disabled={stepHasErrors}
            >
              Next
              <IconArrowRight />
            </Button>
          ) : (
            <Button type="button" size="xl" onClick={save} disabled={saving}>
              <IconCheck />
              {saving ? "Saving…" : "Save my budget"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
