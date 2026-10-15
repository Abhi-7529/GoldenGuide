"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BudgetBreakdown } from "~/components/budget/budget-breakdown";
import { BudgetLines } from "~/components/budget/budget-lines";
import { BudgetSummary } from "~/components/budget/budget-summary";
import { ChoiceGroup } from "~/components/budget/choice-group";
import { MoneyInput } from "~/components/budget/money-input";
import { Term } from "~/components/budget/term";
import {
  IconArrowLeft,
  IconCheck,
  IconShieldAlert,
  IconTarget,
  IconUsers,
} from "~/components/icons";
import { ReadAloudButton } from "~/components/recipient/read-aloud-button";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  applyChallenge,
  type BudgetDraft,
  CHALLENGES,
  type ChallengeId,
  challengeOf,
  draftFromTemplate,
  draftOf,
  explainTradeoffs,
  formatMoney,
  isOwnBudget,
  NAME_MAX,
  PERIODS,
  summarize,
  templateOf,
} from "~/lib/budget";
import { createClient } from "~/lib/supabase/client";
import type { BudgetMode, BudgetPeriod, PracticeBudget } from "~/lib/types";
import { cn } from "~/lib/utils";

type ActiveChallenge = {
  id: ChallengeId;
  /** The budget before the challenge, restored when it ends. */
  before: BudgetDraft;
  /** The budget right after the challenge was added. */
  start: BudgetDraft;
  changed: string;
};

type Confirm = "delete" | "reset" | "share" | null;

/** The parts of a budget that count as unsaved changes. */
function contentKey(d: BudgetDraft) {
  return JSON.stringify([d.name, d.income, d.expenses, d.savings_goal]);
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-2xl border-2 border-border bg-card/50 p-4 sm:p-6",
        className,
      )}
    >
      <h2 className="text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function BudgetEditor({
  budget,
  caregiver,
  suggestedChallenges,
  startChallenge,
  justCreated,
}: {
  budget: PracticeBudget;
  caregiver: { id: string; name: string } | null;
  /** Challenges the caregiver suggested that aren't done yet. */
  suggestedChallenges: ChallengeId[];
  startChallenge: ChallengeId | null;
  justCreated: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<BudgetDraft>(() => draftOf(budget));
  const [draft, setDraft] = useState<BudgetDraft>(() => draftOf(budget));
  const [period, setPeriod] = useState<BudgetPeriod>(budget.period);
  const [mode, setMode] = useState<BudgetMode>(budget.mode);
  const [sharedWith, setSharedWith] = useState(budget.shared_with);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [goalInvalid, setGoalInvalid] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  // Bumped to redraw every amount box after Undo, Start over, or a challenge.
  const [version, setVersion] = useState(0);
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null);
  const [finished, setFinished] = useState<{
    title: string;
    notes: string[];
  } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    justCreated ? "Your budget is saved." : null,
  );
  const [error, setError] = useState<string | null>(null);
  const challengeRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const totals = summarize(draft);
  const dirty = contentKey(draft) !== contentKey(saved);
  const shownPeriod: BudgetPeriod = challenge ? "monthly" : period;
  const advanced = mode === "advanced";
  const isShared = !!caregiver && sharedWith === caregiver.id;
  const own = isOwnBudget(draft.template);

  useEffect(() => {
    if (!dirty && !challenge) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, challenge]);

  // A ?challenge= link (for example from a caregiver's suggestion) starts it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: start only once, on the first render
  useEffect(() => {
    if (startChallenge && !started.current) {
      started.current = true;
      begin(startChallenge);
      // Drop ?challenge= so reloading the page doesn't start it again.
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function markInvalid(id: string, bad: boolean) {
    setInvalid((prev) => {
      const next = new Set(prev);
      if (bad) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function replaceDraft(next: BudgetDraft) {
    setDraft(next);
    setInvalid(new Set());
    setGoalInvalid(false);
    setShowErrors(false);
    setVersion((v) => v + 1);
  }

  /** Period and mode are display choices, saved right away. */
  async function savePreference(patch: {
    period?: BudgetPeriod;
    mode?: BudgetMode;
  }) {
    if (patch.period) setPeriod(patch.period);
    if (patch.mode) setMode(patch.mode);
    const supabase = createClient();
    await supabase.from("practice_budgets").update(patch).eq("id", budget.id);
  }

  async function save() {
    setError(null);
    setNotice(null);
    if (!draft.name.trim()) {
      setError("Please give your budget a name.");
      return;
    }
    const unnamed = [...draft.income, ...draft.expenses].some(
      (l) => !l.label.trim(),
    );
    if (unnamed) {
      setShowErrors(true);
      setError("Please give every line a name before saving.");
      return;
    }
    if (invalid.size > 0 || goalInvalid) {
      setError("Please fix the amounts marked in red before saving.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const clean = {
      ...draft,
      name: draft.name.trim(),
      income: draft.income.map((l) => ({ ...l, label: l.label.trim() })),
      expenses: draft.expenses.map((l) => ({ ...l, label: l.label.trim() })),
    };
    const { error: updateError } = await supabase
      .from("practice_budgets")
      .update({
        name: clean.name,
        income: clean.income,
        expenses: clean.expenses,
        savings_goal: clean.savings_goal,
      })
      .eq("id", budget.id);
    if (updateError) {
      setBusy(false);
      setError("Sorry, we couldn't save your changes. Please try again.");
      return;
    }
    if (clean.savings_goal > 0) {
      await supabase.rpc("finish_budget_activity", {
        p_activity: "savings_goal",
      });
    }
    setBusy(false);
    setSaved(clean);
    setDraft(clean);
    setShowErrors(false);
    setNotice("Your changes are saved.");
  }

  function undo() {
    replaceDraft(saved);
    setError(null);
    setNotice("Your budget is back to how it was last saved.");
  }

  function startOver() {
    const fresh = draftFromTemplate(draft.template);
    replaceDraft({ ...fresh, name: draft.name });
    setConfirm(null);
    setNotice(
      own
        ? "Every amount is back to $0. Save if you'd like to keep it this way."
        : "The example amounts are back. Save if you'd like to keep them this way.",
    );
  }

  async function makeCopy() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("practice_budgets")
      .insert({
        user_id: budget.user_id,
        name: `Copy of ${draft.name.trim() || budget.name}`.slice(0, NAME_MAX),
        template: draft.template,
        period,
        mode,
        income: draft.income,
        expenses: draft.expenses,
        savings_goal: draft.savings_goal,
      })
      .select("id")
      .single();
    setBusy(false);
    if (insertError || !data) {
      setError(
        invalid.size > 0
          ? "Please fix the amounts marked in red before making a copy."
          : "Sorry, we couldn't make a copy. Please try again.",
      );
      return;
    }
    router.push(`/budget/${data.id}`);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("practice_budgets")
      .delete()
      .eq("id", budget.id);
    if (deleteError) {
      setBusy(false);
      setError("Sorry, we couldn't delete this budget. Please try again.");
      return;
    }
    router.push("/budget");
    router.refresh();
  }

  async function share(on: boolean) {
    if (!caregiver) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: shareError } = await supabase
      .from("practice_budgets")
      .update({ shared_with: on ? caregiver.id : null })
      .eq("id", budget.id);
    setBusy(false);
    setConfirm(null);
    if (shareError) {
      setError("Sorry, that didn't work. Please try again.");
      return;
    }
    setSharedWith(on ? caregiver.id : null);
    setNotice(
      on
        ? `${caregiver.name} can now see this budget.`
        : `This budget is private again. ${caregiver.name} can't see it.`,
    );
  }

  function begin(id: ChallengeId) {
    const applied = applyChallenge(draft.expenses, id);
    const start = { ...draft, expenses: applied.expenses };
    setChallenge({ id, before: draft, start, changed: applied.changed });
    setFinished(null);
    setNotice(null);
    replaceDraft(start);
    setTimeout(() => {
      challengeRef.current?.focus();
      challengeRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }

  async function endChallenge(completed: boolean) {
    if (!challenge) return;
    const info = challengeOf(challenge.id);
    if (completed && info) {
      setFinished({
        title: info.title,
        notes: explainTradeoffs(challenge.start, draft),
      });
    }
    replaceDraft(challenge.before);
    setChallenge(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (completed && info) {
      // Marks a matching caregiver suggestion as done. Supabase only sends
      // the request once it's awaited.
      const supabase = createClient();
      await supabase.rpc("finish_budget_activity", {
        p_activity: challenge.id,
      });
    }
  }

  const challengeInfo = challenge ? challengeOf(challenge.id) : null;
  const balanced = totals.remaining >= 0;
  const tradeoffs = challenge ? explainTradeoffs(challenge.start, draft) : [];

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        (dirty || challenge) && "pb-64 sm:pb-32",
      )}
    >
      <div className="flex flex-col gap-3">
        <Link
          href="/budget"
          className="flex w-fit items-center gap-2 text-lg font-medium underline decoration-primary decoration-2 underline-offset-4"
        >
          <IconArrowLeft className="size-5" />
          All my budgets
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight break-words">
            {draft.name.trim() || "My budget"}
          </h1>
          {isShared && (
            <Badge variant="outline" className="text-base">
              <IconUsers />
              Shared with {caregiver.name}
            </Badge>
          )}
        </div>
        <p className="text-lg text-muted-foreground">
          {own
            ? "Your own numbers. Only you can see this budget unless you share it."
            : `A made-up example: ${templateOf(draft.template).label}. Change anything you like.`}
        </p>
      </div>

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border-2 border-primary/40 bg-primary/5 p-4 text-xl"
        >
          <IconCheck className="size-6 shrink-0" />
          {notice}
        </p>
      )}

      {finished && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border-2 border-primary/40 bg-primary/5 p-5"
        >
          <p className="flex items-center gap-2 text-2xl font-bold">
            <IconCheck className="size-7 shrink-0" />
            Challenge done: {finished.title}
          </p>
          <p className="text-xl">
            Your budget is back to how it was before the challenge. Here's what
            your choices meant:
          </p>
          <ul className="flex list-disc flex-col gap-2 pl-6 text-xl leading-relaxed">
            {finished.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <ReadAloudButton
            text={[
              `Challenge done: ${finished.title}.`,
              ...finished.notes,
            ].join(" ")}
            className="w-fit"
          />
        </div>
      )}

      {challenge && challengeInfo && (
        <div
          ref={challengeRef}
          tabIndex={-1}
          className="flex flex-col gap-4 rounded-2xl border-2 border-amber-500/70 bg-amber-50 p-5 text-amber-950 outline-none dark:border-amber-400/60 dark:bg-amber-950/60 dark:text-amber-50"
        >
          <p className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
            <IconTarget className="size-6 shrink-0" />
            Practice challenge
          </p>
          <h2 className="text-2xl font-bold">{challengeInfo.title}</h2>
          <p className="text-xl leading-relaxed">{challengeInfo.story}</p>
          <p className="text-xl leading-relaxed">
            <span className="font-semibold">What changed: </span>
            {challenge.changed}
          </p>
          <ReadAloudButton
            text={`${challengeInfo.title}. ${challengeInfo.story} ${challenge.changed}`}
            className="w-fit"
          />
          <div
            aria-live="polite"
            className="flex flex-col gap-2 rounded-xl border-2 border-current/20 bg-background/70 p-4 text-foreground"
          >
            {balanced ? (
              <>
                <p className="flex items-center gap-2 text-xl font-bold">
                  <IconCheck className="size-6 shrink-0" />
                  Your budget balances!
                </p>
                <ul className="flex list-disc flex-col gap-2 pl-6 text-lg leading-relaxed">
                  {tradeoffs.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 text-xl font-bold">
                  <IconShieldAlert className="size-6 shrink-0 text-destructive" />
                  Your budget is now {formatMoney(-totals.remaining)} short this
                  month
                </p>
                <p className="text-lg">
                  Change some amounts below until nothing is short. You can
                  lower an expense, use some savings, or add income.
                </p>
              </>
            )}
          </div>
          <p className="text-lg">
            When you finish, your budget goes back to how it was. Nothing you
            change here is saved.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              size="xl"
              disabled={!balanced}
              onClick={() => void endChallenge(true)}
            >
              <IconCheck />
              Finish the challenge
            </Button>
            <Button
              type="button"
              size="xl"
              variant="outline"
              className="border-2"
              onClick={() => void endChallenge(false)}
            >
              Stop without finishing
            </Button>
          </div>
        </div>
      )}

      <BudgetSummary
        totals={totals}
        period={shownPeriod}
        savingsGoal={draft.savings_goal}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <ChoiceGroup
            legend="Show amounts for each"
            options={PERIODS.map((p) => ({ value: p.id, label: p.label }))}
            value={shownPeriod}
            onChange={(p) => savePreference({ period: p })}
            disabled={!!challenge}
          />
          {challenge && (
            <p className="text-base text-muted-foreground">
              Challenges are worked out month by month.
            </p>
          )}
        </div>
        <ChoiceGroup
          legend="How much to show"
          options={[
            {
              value: "simple",
              label: "Simple",
              description: "Change and add",
            },
            {
              value: "advanced",
              label: "Advanced",
              description: "Also rename, remove",
            },
          ]}
          value={mode}
          onChange={(m) => savePreference({ mode: m })}
        />
      </div>

      <Section title="Money coming in">
        <div className="flex flex-col gap-1">
          <Term id="income" />
          <Term id="fixedIncome" />
        </div>
        <BudgetLines
          key={`income-${version}`}
          kind="income"
          lines={draft.income}
          onChange={(income) => setDraft({ ...draft, income })}
          onInvalid={markInvalid}
          period={shownPeriod}
          mode={mode}
          sliderHint={Math.max(totals.income, 5000)}
          showErrors={showErrors}
          canAdd
        />
      </Section>

      <Section title="Money going out">
        <div className="flex flex-col gap-1">
          <Term id="expense" />
          <Term id="fixed" />
        </div>
        <BudgetLines
          key={`expenses-${version}`}
          kind="expense"
          lines={draft.expenses}
          onChange={(expenses) => setDraft({ ...draft, expenses })}
          onInvalid={markInvalid}
          period={shownPeriod}
          mode={mode}
          sliderHint={totals.income}
          showErrors={showErrors}
          canAdd
        />
      </Section>

      <Section title="Savings goal">
        <Term id="savingsGoal" />
        <MoneyInput
          key={`goal-${version}-${shownPeriod}`}
          label="My savings goal"
          help="Leave it at $0 if you'd rather not set one."
          value={draft.savings_goal}
          period={shownPeriod}
          sliderHint={Math.max(totals.income / 4, 500)}
          onChange={(v) => {
            setGoalInvalid(v === null);
            if (v !== null) setDraft({ ...draft, savings_goal: v });
          }}
        />
      </Section>

      <Section title="Where your money goes">
        <BudgetBreakdown
          expenses={draft.expenses}
          totals={totals}
          period={shownPeriod}
          showKinds={advanced}
        />
        <Term id="leftOver" />
        <Term id="short" />
      </Section>

      {!challenge && (
        <Section title="Try a challenge">
          <p className="text-xl">
            Life brings surprises. Pick one to see how it changes this budget,
            then adjust the amounts to make it work. Your saved budget won't
            change.
          </p>
          <Term id="emergencyFund" />
          <div className="grid gap-3 sm:grid-cols-2">
            {CHALLENGES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => begin(c.id)}
                className="flex min-h-16 flex-col gap-2 rounded-xl border-2 border-border bg-card p-4 text-left transition-colors outline-none hover:border-primary hover:bg-accent focus-visible:ring-4 focus-visible:ring-ring/50"
              >
                <span className="text-xl font-semibold">{c.title}</span>
                <span className="text-lg">{c.story}</span>
                {suggestedChallenges.includes(c.id) && caregiver && (
                  <span className="flex items-center gap-2 text-base font-semibold">
                    <IconUsers className="size-5" />
                    Suggested by {caregiver.name}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Budget settings">
        <div className="flex flex-col gap-2">
          <label htmlFor="budget-name" className="text-xl font-semibold">
            Budget name
          </label>
          <input
            id="budget-name"
            value={draft.name}
            maxLength={NAME_MAX}
            disabled={!!challenge}
            aria-invalid={!draft.name.trim() || undefined}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="h-14 w-full rounded-lg border-2 border-input bg-background px-3 text-xl outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/40 disabled:opacity-60 aria-invalid:border-destructive dark:bg-input/30"
          />
          {!draft.name.trim() && (
            <p className="text-lg font-medium text-destructive">
              Please give your budget a name.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-xl font-semibold">Sharing</h3>
          {!caregiver ? (
            <p className="text-lg text-muted-foreground">
              This budget is private. Only you can see it.
            </p>
          ) : isShared ? (
            <>
              <p className="text-lg">
                {caregiver.name} can see this budget's saved numbers. They can't
                change anything.
              </p>
              <Button
                type="button"
                size="xl"
                variant="outline"
                className="w-full border-2 sm:w-fit"
                disabled={busy}
                onClick={() => share(false)}
              >
                Stop sharing
              </Button>
            </>
          ) : confirm === "share" ? (
            <div className="flex flex-col gap-3 rounded-xl border-2 border-primary/50 p-4">
              <p className="text-xl">
                Share “{saved.name}” with {caregiver.name}? They'll see its
                saved numbers but can't change them. You can stop sharing at any
                time.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  size="xl"
                  disabled={busy}
                  onClick={() => share(true)}
                >
                  Yes, share it
                </Button>
                <Button
                  type="button"
                  size="xl"
                  variant="outline"
                  className="border-2"
                  onClick={() => setConfirm(null)}
                >
                  No, keep it private
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-lg">
                This budget is private. Only you can see it.
              </p>
              <Button
                type="button"
                size="xl"
                variant="outline"
                className="w-full border-2 sm:w-fit"
                onClick={() => setConfirm("share")}
              >
                <IconUsers />
                Share with {caregiver.name}
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-xl font-semibold">More options</h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="xl"
              variant="outline"
              className="border-2"
              disabled={busy || !!challenge}
              onClick={makeCopy}
            >
              Make a copy
            </Button>
            <Button
              type="button"
              size="xl"
              variant="outline"
              className="border-2"
              disabled={busy || !!challenge}
              onClick={() => setConfirm("reset")}
            >
              {own
                ? "Clear all amounts"
                : "Start over with the example amounts"}
            </Button>
            <Button
              type="button"
              size="xl"
              variant="outline"
              className="border-2 border-destructive/60 text-destructive hover:bg-destructive/5 hover:text-destructive"
              disabled={busy || !!challenge}
              onClick={() => setConfirm("delete")}
            >
              Delete this budget
            </Button>
          </div>
          <p className="text-base text-muted-foreground">
            A copy includes any changes you haven't saved yet.
          </p>

          {confirm === "reset" && (
            <div
              role="alertdialog"
              aria-labelledby="reset-title"
              className="flex flex-col gap-3 rounded-xl border-2 border-primary/50 p-4"
            >
              <p id="reset-title" className="text-xl">
                {own
                  ? "Set every amount back to $0 and remove lines you added?"
                  : `Put back the starting amounts from “${templateOf(draft.template).label}”? Your changes and added lines will be cleared.`}{" "}
                Nothing is saved until you press Save.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" size="xl" onClick={startOver}>
                  Yes, start over
                </Button>
                <Button
                  type="button"
                  size="xl"
                  variant="outline"
                  className="border-2"
                  onClick={() => setConfirm(null)}
                >
                  No, keep my numbers
                </Button>
              </div>
            </div>
          )}

          {confirm === "delete" && (
            <div
              role="alertdialog"
              aria-labelledby="delete-title"
              className="flex flex-col gap-3 rounded-xl border-2 border-destructive/60 bg-destructive/5 p-4"
            >
              <p id="delete-title" className="text-xl font-semibold">
                Delete “{saved.name}” for good?
              </p>
              <p className="text-xl">
                This can't be undone. Your other budgets won't change.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  size="xl"
                  variant="destructive"
                  disabled={busy}
                  onClick={remove}
                >
                  Yes, delete it
                </Button>
                <Button
                  type="button"
                  size="xl"
                  variant="outline"
                  className="border-2"
                  onClick={() => setConfirm(null)}
                >
                  No, keep it
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {error && !dirty && (
        <p role="alert" className="text-xl font-medium text-destructive">
          {error}
        </p>
      )}

      <p className="text-lg text-muted-foreground">
        This calculator is for planning and learning. It gives general
        information, not financial advice for your situation.
      </p>

      {(dirty || challenge) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            {challenge ? (
              <p className="text-lg font-medium">
                You're in a practice challenge. Changes here won't be saved.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <p className="text-lg font-medium">
                    You have changes that aren't saved yet.
                  </p>
                  {error && (
                    <p
                      role="alert"
                      className="text-lg font-medium text-destructive"
                    >
                      {error}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    size="xl"
                    disabled={busy}
                    onClick={save}
                  >
                    <IconCheck />
                    {busy ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    size="xl"
                    variant="outline"
                    className="border-2"
                    disabled={busy}
                    onClick={undo}
                  >
                    Undo changes
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
