// Budget Calculator: plan a budget with your own numbers, or practice with a
// made-up example. Everything here is plain arithmetic and prewritten
// explanations (no AI, no paid APIs). It's a planning and learning tool, not
// a money service: no bank connections, and only general information, never
// personal financial advice. Amounts are stored as monthly dollars and
// converted for the weekly and yearly views.
//
// Template, period, mode and activity ids are also listed in the database
// check constraints (see the add_practice_budgets migration). Change both
// together.

import type { TopicId } from "~/lib/learning-plan";
import type { createClient } from "~/lib/supabase/server";
import type {
  BudgetCategoryId,
  BudgetLine,
  BudgetMode,
  BudgetPeriod,
  BudgetTemplateId,
  PracticeBudget,
} from "~/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** The largest amount one line can hold, in monthly dollars. */
export const MAX_AMOUNT = 10_000_000;
export const MAX_LINES = 30;
export const NAME_MAX = 60;
export const LABEL_MAX = 40;

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

export const PERIODS: {
  id: BudgetPeriod;
  label: string;
  per: string;
  /** How many of this period fit in a month. */
  perMonth: number;
  sliderStep: number;
}[] = [
  {
    id: "weekly",
    label: "Week",
    per: "a week",
    perMonth: 52 / 12,
    sliderStep: 1,
  },
  { id: "monthly", label: "Month", per: "a month", perMonth: 1, sliderStep: 5 },
  {
    id: "yearly",
    label: "Year",
    per: "a year",
    perMonth: 1 / 12,
    sliderStep: 50,
  },
];

function periodOf(id: BudgetPeriod) {
  return PERIODS.find((p) => p.id === id) ?? PERIODS[1];
}

export function perPeriod(id: BudgetPeriod) {
  return periodOf(id).per;
}

export function roundCents(n: number) {
  return Math.round(n * 100) / 100;
}

/** A monthly amount shown in another period. */
export function toPeriod(monthly: number, period: BudgetPeriod) {
  return roundCents(monthly / periodOf(period).perMonth);
}

/** An amount typed in a period, stored as monthly. */
export function fromPeriod(value: number, period: BudgetPeriod) {
  return roundCents(value * periodOf(period).perMonth);
}

export function sliderStep(period: BudgetPeriod) {
  return periodOf(period).sliderStep;
}

const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const withCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$1,250" for whole dollars, "$103.85" otherwise. */
export function formatMoney(n: number) {
  const rounded = roundCents(n);
  return Number.isInteger(rounded)
    ? wholeDollars.format(rounded)
    : withCents.format(rounded);
}

/** The text shown in an amount box: "1250" or "103.85". */
export function moneyText(n: number) {
  const rounded = roundCents(n);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/**
 * Reads an amount typed by a person. Allows "$1,250.50" style input. An empty
 * box counts as zero.
 */
export function parseMoney(
  text: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const cleaned = text.replace(/[$,\s]/g, "");
  if (cleaned === "") return { ok: true, value: 0 };
  if (cleaned.startsWith("-")) {
    return { ok: false, error: "Amounts can't be less than zero." };
  }
  if (!/^\d*\.?\d{0,2}$/.test(cleaned) || cleaned === ".") {
    return {
      ok: false,
      error: "Please use numbers only, like 250 or 99.50.",
    };
  }
  return { ok: true, value: Number(cleaned) };
}

/** A round number a little above `n`, for the top of a slider. */
export function niceCeil(n: number) {
  if (n <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(n));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = steps.find((s) => s * magnitude >= n) ?? 10;
  return step * magnitude;
}

export function newLineId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type ExpenseKind = "need" | "want" | "saving";

export const CATEGORIES: {
  id: Exclude<BudgetCategoryId, "custom">;
  label: string;
  kind: ExpenseKind;
  help: string;
}[] = [
  {
    id: "housing",
    label: "Housing",
    kind: "need",
    help: "Rent or mortgage, property tax, and home insurance.",
  },
  {
    id: "groceries",
    label: "Groceries",
    kind: "need",
    help: "Food and household basics from the store.",
  },
  {
    id: "utilities",
    label: "Utilities",
    kind: "need",
    help: "Electricity, heating, water, phone, and internet.",
  },
  {
    id: "transportation",
    label: "Transportation",
    kind: "need",
    help: "Gas, car insurance, bus fare, or rides.",
  },
  {
    id: "healthcare",
    label: "Healthcare",
    kind: "need",
    help: "Insurance premiums, medicine, and doctor visits.",
  },
  {
    id: "entertainment",
    label: "Fun and hobbies",
    kind: "want",
    help: "Eating out, movies, gifts, trips, and hobbies.",
  },
  {
    id: "savings",
    label: "Savings",
    kind: "saving",
    help: "Money you put aside each month for later or for emergencies.",
  },
];

export function categoryOf(id: BudgetCategoryId) {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

export function kindOf(line: BudgetLine): ExpenseKind {
  return categoryOf(line.category)?.kind ?? "want";
}

export const KIND_LABELS: Record<ExpenseKind, string> = {
  need: "Needs",
  want: "Wants",
  saving: "Saving",
};

// ---------------------------------------------------------------------------
// Templates (fictional examples)
// ---------------------------------------------------------------------------

type TemplateAmounts = Record<Exclude<BudgetCategoryId, "custom">, number>;

export const TEMPLATES: {
  id: BudgetTemplateId;
  label: string;
  description: string;
  example: string;
  income: { label: string; amount: number }[];
  expenses: TemplateAmounts;
  savingsGoal: number;
}[] = [
  {
    id: "retirement",
    label: "Retirement",
    description: "For people who have stopped working.",
    example:
      "Example: Ruth and Harold are retired. They live on Social Security and a small pension.",
    income: [
      { label: "Social Security", amount: 2400 },
      { label: "Pension", amount: 800 },
    ],
    expenses: {
      housing: 1100,
      groceries: 450,
      utilities: 220,
      transportation: 250,
      healthcare: 380,
      entertainment: 150,
      savings: 200,
    },
    savingsGoal: 300,
  },
  {
    id: "fixed_income",
    label: "Fixed income",
    description: "When the same amount comes in every month.",
    example:
      "Example: Dorothy lives alone. Her only income is the same Social Security check each month.",
    income: [{ label: "Social Security", amount: 1850 }],
    expenses: {
      housing: 850,
      groceries: 320,
      utilities: 180,
      transportation: 120,
      healthcare: 210,
      entertainment: 60,
      savings: 50,
    },
    savingsGoal: 100,
  },
  {
    id: "household",
    label: "General household",
    description: "A typical home budget with a paycheck.",
    example:
      "Example: The Garcia family has one paycheck coming in and the usual home costs.",
    income: [{ label: "Paycheck", amount: 3600 }],
    expenses: {
      housing: 1300,
      groceries: 600,
      utilities: 250,
      transportation: 350,
      healthcare: 250,
      entertainment: 200,
      savings: 300,
    },
    savingsGoal: 400,
  },
  {
    id: "blank",
    label: "My own numbers",
    description: "Every amount starts at $0 so you can fill in your own.",
    example:
      "Rounded numbers are fine. You'll never need account numbers or passwords.",
    income: [{ label: "Income", amount: 0 }],
    expenses: {
      housing: 0,
      groceries: 0,
      utilities: 0,
      transportation: 0,
      healthcare: 0,
      entertainment: 0,
      savings: 0,
    },
    savingsGoal: 0,
  },
];

export function templateOf(id: BudgetTemplateId) {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[2];
}

/** The made-up examples, without the "my own numbers" starting point. */
export const EXAMPLE_TEMPLATES = TEMPLATES.filter((t) => t.id !== "blank");

/** A budget the person filled in with their own numbers, not an example. */
export function isOwnBudget(template: BudgetTemplateId) {
  return template === "blank";
}

/** The parts of a budget a person edits. */
export type BudgetDraft = {
  name: string;
  template: BudgetTemplateId;
  period: BudgetPeriod;
  mode: BudgetMode;
  income: BudgetLine[];
  expenses: BudgetLine[];
  savings_goal: number;
};

export function draftFromTemplate(id: BudgetTemplateId): BudgetDraft {
  const t = templateOf(id);
  return {
    name: isOwnBudget(t.id) ? "My budget" : `${t.label} example`,
    template: t.id,
    period: "monthly",
    mode: "simple",
    income: t.income.map((i) => ({
      id: newLineId(),
      label: i.label,
      amount: i.amount,
      category: "custom",
    })),
    expenses: CATEGORIES.map((c) => ({
      id: newLineId(),
      label: c.label,
      amount: t.expenses[c.id],
      category: c.id,
    })),
    savings_goal: t.savingsGoal,
  };
}

export function draftOf(budget: PracticeBudget): BudgetDraft {
  return {
    name: budget.name,
    template: budget.template,
    period: budget.period,
    mode: budget.mode,
    income: budget.income,
    expenses: budget.expenses,
    savings_goal: Number(budget.savings_goal),
  };
}

// ---------------------------------------------------------------------------
// Totals and feedback
// ---------------------------------------------------------------------------

const sum = (lines: BudgetLine[]) =>
  roundCents(lines.reduce((total, l) => total + l.amount, 0));

/** Monthly totals for a budget. */
export function summarize(draft: Pick<BudgetDraft, "income" | "expenses">) {
  const income = sum(draft.income);
  const expenses = sum(draft.expenses);
  const byKind = (kind: ExpenseKind) =>
    sum(draft.expenses.filter((l) => kindOf(l) === kind));
  return {
    income,
    expenses,
    remaining: roundCents(income - expenses),
    savings: byKind("saving"),
    needs: byKind("need"),
    wants: byKind("want"),
  };
}

export type BudgetTotals = ReturnType<typeof summarize>;

export type Feedback = {
  tone: "short" | "even" | "left";
  title: string;
  message: string;
  ideas: string[];
};

/** Plain-words feedback on the whole budget, for the chosen period. */
export function budgetFeedback(
  totals: BudgetTotals,
  period: BudgetPeriod,
): Feedback {
  const per = perPeriod(period);
  const gap = formatMoney(Math.abs(toPeriod(totals.remaining, period)));

  if (totals.income === 0 && totals.expenses === 0) {
    return {
      tone: "even",
      title: "Let's fill in some numbers",
      message:
        "Add the money coming in and going out, and this will show how they compare.",
      ideas: [],
    };
  }
  if (totals.remaining < 0) {
    return {
      tone: "short",
      title: `You're spending ${gap} more than comes in`,
      message: `This budget is short by ${gap} ${per}. In real life, a gap like this is often covered with savings or a credit card, and that can get expensive over time.`,
      ideas: [
        "Look at the “wants” first, like fun and hobbies. They are often the easiest to change.",
        "See if any bill could be lower, like a phone or TV plan.",
        "Check whether more money could come in, such as a benefit you haven't claimed.",
      ],
    };
  }
  if (totals.remaining === 0) {
    return {
      tone: "even",
      title: "Every dollar has a job",
      message:
        "The money coming in matches the money going out. Some people like to plan every dollar this way. It can help to keep a little extra for surprises.",
      ideas: [],
    };
  }
  return {
    tone: "left",
    title: `You have ${gap} left over ${per}`,
    message:
      "Money left over gives you room for surprises. Some people move extra money into savings so it doesn't get spent without a plan.",
    ideas: [],
  };
}

/** How the savings in the budget compare with the savings goal. */
export function savingsFeedback(
  totals: BudgetTotals,
  goal: number,
  period: BudgetPeriod,
) {
  if (goal <= 0) return null;
  const per = perPeriod(period);
  const saving = formatMoney(toPeriod(totals.savings, period));
  const target = formatMoney(toPeriod(goal, period));
  if (totals.savings >= goal) {
    return {
      met: true,
      message: `You're saving ${saving} ${per}. That reaches your goal of ${target}. Well done!`,
    };
  }
  const missing = roundCents(goal - totals.savings);
  const canCover = totals.remaining >= missing;
  return {
    met: false,
    message: `You're saving ${saving} of your ${target} goal ${per}.${
      canCover
        ? ` Your money left over could cover the other ${formatMoney(toPeriod(missing, period))}.`
        : ""
    }`,
  };
}

// ---------------------------------------------------------------------------
// Challenges and activities
// ---------------------------------------------------------------------------

export type ActivityId =
  | "first_budget"
  | "savings_goal"
  | "medical_bill"
  | "car_repair"
  | "grocery_prices"
  | "heating_bill"
  | "rent_increase";

export type ChallengeId = Exclude<ActivityId, "first_budget" | "savings_goal">;

type ChallengeChange =
  | { kind: "add"; label: string; amount: number }
  | {
      kind: "raise";
      category: BudgetCategoryId;
      percent?: number;
      amount?: number;
      fallbackLabel: string;
      fallbackAmount: number;
    };

export const CHALLENGES: {
  id: ChallengeId;
  title: string;
  story: string;
  change: ChallengeChange;
}[] = [
  {
    id: "medical_bill",
    title: "A surprise doctor's bill",
    story:
      "You visit the doctor and get a bill for $450 that insurance didn't cover. It's due this month.",
    change: { kind: "add", label: "Doctor's bill (this month)", amount: 450 },
  },
  {
    id: "car_repair",
    title: "The car needs a repair",
    story:
      "Your car won't start. The repair shop says fixing it will cost $600 this month.",
    change: { kind: "add", label: "Car repair (this month)", amount: 600 },
  },
  {
    id: "grocery_prices",
    title: "Grocery prices go up",
    story:
      "Prices at the grocery store have gone up. The same groceries now cost 15% more each month.",
    change: {
      kind: "raise",
      category: "groceries",
      percent: 15,
      fallbackLabel: "Higher grocery prices",
      fallbackAmount: 60,
    },
  },
  {
    id: "heating_bill",
    title: "A cold winter month",
    story:
      "It's a very cold month. Your heating bill is $90 higher than usual.",
    change: {
      kind: "raise",
      category: "utilities",
      amount: 90,
      fallbackLabel: "Higher heating bill",
      fallbackAmount: 90,
    },
  },
  {
    id: "rent_increase",
    title: "The rent goes up",
    story:
      "Your landlord sends a letter. Starting this month, your housing costs go up by 6%.",
    change: {
      kind: "raise",
      category: "housing",
      percent: 6,
      fallbackLabel: "Higher housing cost",
      fallbackAmount: 60,
    },
  },
];

export function challengeOf(id: string | undefined | null) {
  return CHALLENGES.find((c) => c.id === id) ?? null;
}

/**
 * Applies a challenge to a budget. Returns the new expenses, a plain-words
 * description of what changed, and the monthly cost of the change.
 */
export function applyChallenge(
  expenses: BudgetLine[],
  challengeId: ChallengeId,
): { expenses: BudgetLine[]; changed: string; cost: number } {
  const challenge = challengeOf(challengeId);
  if (!challenge) return { expenses, changed: "", cost: 0 };
  const { change } = challenge;

  if (change.kind === "raise") {
    const target = expenses.find((l) => l.category === change.category);
    if (target) {
      const extra = roundCents(
        change.amount ?? (target.amount * (change.percent ?? 0)) / 100,
      );
      return {
        expenses: expenses.map((l) =>
          l.id === target.id
            ? { ...l, amount: roundCents(l.amount + extra) }
            : l,
        ),
        changed: `${target.label} went up by ${formatMoney(extra)}, from ${formatMoney(target.amount)} to ${formatMoney(target.amount + extra)} a month.`,
        cost: extra,
      };
    }
    return {
      expenses: [
        ...expenses,
        {
          id: newLineId(),
          label: change.fallbackLabel,
          amount: change.fallbackAmount,
          category: "custom",
        },
      ],
      changed: `A new cost of ${formatMoney(change.fallbackAmount)} a month was added: “${change.fallbackLabel}”.`,
      cost: change.fallbackAmount,
    };
  }

  return {
    expenses: [
      ...expenses,
      {
        id: newLineId(),
        label: change.label,
        amount: change.amount,
        category: "custom",
      },
    ],
    changed: `A new cost of ${formatMoney(change.amount)} was added for this month: “${change.label}”.`,
    cost: change.amount,
  };
}

const TRADEOFFS: Partial<Record<BudgetCategoryId, string>> = {
  savings:
    "Saving less covers the cost now, but leaves less money for the next surprise.",
  entertainment:
    "Spending less on fun for a while is a common way to make room. It can be hard to keep up for a long time, so some people plan a small treat.",
  groceries:
    "Groceries can often cost less with sales, store brands, and a shopping list. Cutting too much can mean skipping healthy meals.",
  healthcare:
    "Cutting healthcare costs can be risky. Skipping medicine or check-ups can lead to bigger bills later.",
  housing:
    "Housing costs are usually hard to change quickly. Moving or finding a roommate are big decisions.",
  utilities:
    "Utilities can sometimes be lowered, like turning down the heat a little or changing a phone plan.",
  transportation:
    "Driving less or sharing rides can lower costs, but it may make errands harder.",
};

/**
 * General tradeoffs of what a person changed to balance a challenge, in plain
 * words. This explains common effects; it isn't advice for anyone's situation.
 */
export function explainTradeoffs(
  before: Pick<BudgetDraft, "income" | "expenses">,
  after: Pick<BudgetDraft, "income" | "expenses">,
) {
  const notes: string[] = [];
  const beforeById = new Map(before.expenses.map((l) => [l.id, l]));
  const afterIds = new Set(after.expenses.map((l) => l.id));

  const lowered = [
    ...after.expenses
      .map((l) => ({ line: l, was: beforeById.get(l.id)?.amount ?? l.amount }))
      .filter(({ line, was }) => line.amount < was),
    ...before.expenses
      .filter((l) => !afterIds.has(l.id))
      .map((l) => ({ line: { ...l, amount: 0 }, was: l.amount })),
  ];

  for (const { line, was } of lowered) {
    const by = formatMoney(was - line.amount);
    const why =
      TRADEOFFS[line.category] ??
      "Spending less here makes room. Think about whether you'd miss it, and for how long.";
    notes.push(`You lowered “${line.label}” by ${by}. ${why}`);
  }

  const incomeBefore = sum(before.income);
  const incomeAfter = sum(after.income);
  if (incomeAfter > incomeBefore) {
    notes.push(
      `You added ${formatMoney(incomeAfter - incomeBefore)} of income. More money coming in closes the gap, but extra work or new benefits aren't always possible.`,
    );
  }

  const leftBefore = summarize(before).remaining;
  const leftAfter = summarize(after).remaining;
  if (notes.length === 0 && leftAfter >= 0) {
    notes.push(
      leftBefore >= 0
        ? "Your money left over covered it, so nothing else had to change. This is why keeping a little extra each month helps."
        : "Your budget can cover this now.",
    );
  } else if (leftBefore > 0 && leftAfter < leftBefore) {
    notes.push(
      "Some of your money left over went toward it too. That money is no longer free for other surprises this month.",
    );
  }
  return notes;
}

export const ACTIVITIES: {
  id: ActivityId;
  title: string;
  /** For caregivers: what the learner will do. */
  description: string;
  /** The same, in words for the learner. */
  learnerDescription: string;
  topics: TopicId[];
}[] = [
  {
    id: "first_budget",
    title: "Make a budget",
    description:
      "Set up a budget step by step, with their own numbers or a made-up example.",
    learnerDescription:
      "Set up a budget step by step, with your own numbers or a made-up example.",
    topics: ["budgeting", "bills"],
  },
  {
    id: "savings_goal",
    title: "Set a savings goal",
    description: "Choose how much to put aside each month and see if it fits.",
    learnerDescription:
      "Choose how much to put aside each month and see if it fits.",
    topics: ["savings", "budgeting"],
  },
  ...CHALLENGES.map((c) => ({
    id: c.id,
    title: `Challenge: ${c.title.toLowerCase()}`,
    description: c.story,
    learnerDescription: c.story,
    topics: (
      {
        medical_bill: ["savings", "bills"],
        car_repair: ["savings"],
        grocery_prices: ["budgeting"],
        heating_bill: ["bills"],
        rent_increase: ["budgeting", "bills"],
      } satisfies Record<ChallengeId, TopicId[]>
    )[c.id],
  })),
];

export function activityOf(id: string) {
  return ACTIVITIES.find((a) => a.id === id) ?? null;
}

export function isChallenge(id: ActivityId): id is ChallengeId {
  return CHALLENGES.some((c) => c.id === id);
}

/**
 * Activities ordered for a caregiver: those that match the topic of one of
 * the learner's assigned lessons come first, with that lesson attached.
 */
export function activitiesForLessons(
  lessons: { id: string; title: string; topic: TopicId | null }[],
) {
  const withLesson = ACTIVITIES.map((a) => ({
    ...a,
    lesson: lessons.find((l) => l.topic && a.topics.includes(l.topic)) ?? null,
  }));
  return [
    ...withLesson.filter((a) => a.lesson),
    ...withLesson.filter((a) => !a.lesson),
  ];
}

// ---------------------------------------------------------------------------
// Words to know
// ---------------------------------------------------------------------------

export const TERMS = {
  budget: {
    term: "Budget",
    meaning: "A plan for the money coming in and the money going out.",
    example:
      "Writing down that $900 goes to rent each month is part of a budget.",
  },
  income: {
    term: "Income",
    meaning: "Money that comes to you.",
    example: "A Social Security check, a pension, or a paycheck.",
  },
  expense: {
    term: "Expense",
    meaning: "Money you spend or pay out.",
    example: "Rent, groceries, and the electric bill are expenses.",
  },
  fixed: {
    term: "Fixed and changing expenses",
    meaning:
      "Fixed expenses cost the same each month. Changing (variable) expenses go up and down.",
    example: "Rent is usually fixed. Groceries and heating change.",
  },
  leftOver: {
    term: "Money left over",
    meaning:
      "What is left after all expenses are paid. It's sometimes called a surplus.",
    example: "$2,000 in minus $1,800 out leaves $200 left over.",
  },
  short: {
    term: "Spending more than comes in",
    meaning:
      "When expenses are bigger than income. It's sometimes called a deficit.",
    example: "$1,500 in and $1,650 out means you are $150 short.",
  },
  savingsGoal: {
    term: "Savings goal",
    meaning: "An amount you aim to put aside, often each month.",
    example: "Putting aside $100 a month adds up to $1,200 in a year.",
  },
  emergencyFund: {
    term: "Emergency fund",
    meaning: "Savings kept for surprises, like a repair or a medical bill.",
    example:
      "Many people aim to save enough for a few months of expenses over time.",
  },
  fixedIncome: {
    term: "Fixed income",
    meaning: "Income that stays about the same each month.",
    example: "A Social Security check or a pension.",
  },
  needsWants: {
    term: "Needs and wants",
    meaning:
      "Needs are things you must pay for, like housing and food. Wants are nice to have, like eating out.",
    example:
      "Some people use a “50/30/20” guide: about half for needs, a third for wants, and a fifth for saving. It's only a starting idea, not a rule.",
  },
} as const;

export type TermId = keyof typeof TERMS;

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

const BUDGET_COLUMNS =
  "id, user_id, name, template, period, mode, income, expenses, savings_goal, shared_with, created_at, updated_at";

function toBudget(row: Record<string, unknown>): PracticeBudget {
  return {
    ...(row as PracticeBudget),
    savings_goal: Number(row.savings_goal ?? 0),
  };
}

/** The learner's own budgets, newest first. */
export async function loadBudgets(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("practice_budgets")
    .select(BUDGET_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map(toBudget);
}

export async function loadBudget(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from("practice_budgets")
    .select(BUDGET_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ? toBudget(data) : null;
}

/** Budgets learners chose to share with the signed-in caregiver. */
export async function loadSharedBudgets(
  supabase: SupabaseClient,
  caregiverId: string,
) {
  const { data } = await supabase
    .from("practice_budgets")
    .select(BUDGET_COLUMNS)
    .eq("shared_with", caregiverId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map(toBudget);
}

export type BudgetActivitySuggestion = {
  id: string;
  caregiver_id: string;
  care_recipient_id: string;
  activity: ActivityId;
  lesson_id: string | null;
  lesson_title: string | null;
  note: string;
  done_at: string | null;
  created_at: string;
};

export async function loadActivitySuggestions(
  supabase: SupabaseClient,
  filter: { caregiverId?: string; recipientId?: string },
): Promise<BudgetActivitySuggestion[]> {
  let query = supabase
    .from("budget_activity_suggestions")
    .select(
      "id, caregiver_id, care_recipient_id, activity, lesson_id, note, done_at, created_at, lessons(title)",
    )
    .order("created_at", { ascending: false });
  if (filter.caregiverId) query = query.eq("caregiver_id", filter.caregiverId);
  if (filter.recipientId)
    query = query.eq("care_recipient_id", filter.recipientId);
  const { data } = await query;

  return (data ?? []).map((row) => {
    const lesson = row.lessons as
      | { title: string }
      | { title: string }[]
      | null;
    const title = Array.isArray(lesson) ? lesson[0]?.title : lesson?.title;
    return {
      id: row.id as string,
      caregiver_id: row.caregiver_id as string,
      care_recipient_id: row.care_recipient_id as string,
      activity: row.activity as ActivityId,
      lesson_id: (row.lesson_id as string | null) ?? null,
      lesson_title: title ?? null,
      note: row.note as string,
      done_at: (row.done_at as string | null) ?? null,
      created_at: row.created_at as string,
    };
  });
}
