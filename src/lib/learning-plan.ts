// Personalized learning paths. Each learner's plan (topics, knowledge level,
// goals) is matched against the existing lesson and practice library with
// simple scoring rules, not AI, so recommendations are free, instant, and
// easy to explain in plain words.
//
// Topic, level and goal ids are also listed in the database check constraints
// (see the add_learning_plans migration). Change both together.

import {
  bestPerLesson,
  loadProgress,
  STRONG_THRESHOLD,
  STRUGGLE_THRESHOLD,
  scoreOf,
} from "~/lib/progress";
import type { createClient } from "~/lib/supabase/server";
import type {
  Lesson,
  LessonCompletion,
  LessonLevel,
  PracticeAttempt,
  Scenario,
} from "~/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// ---------------------------------------------------------------------------
// Topics, levels, goals
// ---------------------------------------------------------------------------

export const TOPICS = [
  {
    id: "scams",
    label: "Spotting scams",
    description: "Warning signs of tricks and fraud",
    lessonTopic: "Scams",
    match: /scam|fraud|phish|impost|identity theft/i,
  },
  {
    id: "loans",
    label: "Loans and credit",
    description: "Credit cards, interest, and borrowing",
    lessonTopic: "Loans & Interest",
    match: /loan|interest|credit|debt|mortgage|borrow/i,
  },
  {
    id: "bills",
    label: "Paying bills",
    description: "Reading statements and due dates",
    lessonTopic: "Bills",
    match: /bill|statement|utilit|due date/i,
  },
  {
    id: "savings",
    label: "Saving money",
    description: "Building a safety cushion",
    lessonTopic: "Savings",
    match: /sav(e|ing)|emergency|rainy day|unexpected/i,
  },
  {
    id: "investing",
    label: "Investing basics",
    description: "Retirement money and investments",
    lessonTopic: "Basic Investing",
    match: /invest|stock|bond|retirement|pension|annuit|\b(ira|401k)\b/i,
  },
  {
    id: "budgeting",
    label: "Budgeting",
    description: "Planning where your money goes",
    lessonTopic: "Budgeting",
    match: /budget|spending|expense/i,
  },
] as const;

export type TopicId = (typeof TOPICS)[number]["id"];

export const LEVELS = [
  {
    id: "beginner",
    label: "Getting started",
    choice: "I'm just starting out",
    description: "Money topics are new to me, or I'd like to start simple.",
  },
  {
    id: "intermediate",
    label: "Next steps",
    choice: "I know some of the basics",
    description: "I handle my own money but want to learn more.",
  },
  {
    id: "advanced",
    label: "Going further",
    choice: "I feel fairly confident",
    description: "I'd like lessons that go into more detail.",
  },
] as const satisfies readonly {
  id: LessonLevel;
  label: string;
  choice: string;
  description: string;
}[];

export const GOALS = [
  {
    id: "avoid_scams",
    label: "Protect myself from scams",
    topics: ["scams"],
  },
  {
    id: "manage_bills",
    label: "Keep on top of my bills",
    topics: ["bills", "budgeting"],
  },
  {
    id: "save_more",
    label: "Save for emergencies",
    topics: ["savings", "budgeting"],
  },
  {
    id: "understand_credit",
    label: "Understand loans and credit cards",
    topics: ["loans"],
  },
  {
    id: "make_money_last",
    label: "Make my money last in retirement",
    topics: ["investing", "savings", "budgeting"],
  },
  {
    id: "feel_confident",
    label: "Feel more confident about money",
    topics: [],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  topics: readonly TopicId[];
}[];

export type GoalId = (typeof GOALS)[number]["id"];

export type LearningPlan = {
  user_id: string;
  topics: TopicId[];
  level: LessonLevel;
  goals: GoalId[];
};

export function topicLabel(id: string) {
  return TOPICS.find((t) => t.id === id)?.label ?? id;
}

export function levelLabel(id: string) {
  return LEVELS.find((l) => l.id === id)?.label ?? id;
}

export function goalLabel(id: string) {
  return GOALS.find((g) => g.id === id)?.label ?? id;
}

const levelRank = (level: LessonLevel) =>
  LEVELS.findIndex((l) => l.id === level);

/** Which plan topic a lesson belongs to, from its topic name, then its title. */
export function topicOfLesson(lesson: { topic: string; title: string }) {
  for (const text of [lesson.topic, lesson.title]) {
    const found = TOPICS.find((t) => t.match.test(text));
    if (found) return found.id;
  }
  return null;
}

/** A scenario takes its linked lesson's topic, or else matches its own text. */
function topicOfScenario(
  scenario: PathScenario,
  lessonsById: Map<string, PathLesson>,
): TopicId | null {
  const lesson = scenario.lesson_id
    ? lessonsById.get(scenario.lesson_id)
    : undefined;
  if (lesson) return topicOfLesson(lesson);
  return topicOfLesson({ topic: scenario.title, title: scenario.prompt });
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export type PathLesson = Pick<
  Lesson,
  "id" | "title" | "topic" | "summary" | "level"
>;
export type PathScenario = Pick<
  Scenario,
  "id" | "title" | "prompt" | "choices" | "lesson_id"
>;

export type Recommendation<T> = { item: T; reason: string };

export type LearningPath = {
  /** The level lessons are matched to: the plan's level, adjusted by scores. */
  level: LessonLevel;
  /** Whether recent quiz scores moved the level away from the plan's. */
  levelChange: "up" | "down" | null;
  /** A plain-language note for the learner when the level changed. */
  levelNote: string | null;
  /** Unfinished lessons, best match first. */
  lessons: Recommendation<PathLesson>[];
  /** Finished lessons with low scores, worth reading again. */
  review: Recommendation<PathLesson>[];
  /** Every practice scenario, best match first. */
  practice: Recommendation<PathScenario>[];
};

/** How many recent quiz results decide whether to change the level. */
const RECENT_RESULTS = 3;

function adjustLevel(
  base: LessonLevel,
  completions: LessonCompletion[],
): Pick<LearningPath, "level" | "levelChange" | "levelNote"> {
  const none = { level: base, levelChange: null, levelNote: null };
  const recent = completions
    .filter((c) => c.question_count > 0)
    .slice(0, RECENT_RESULTS);
  if (recent.length < 2) return none;

  const correct = recent.reduce((sum, c) => sum + c.correct_count, 0);
  const total = recent.reduce((sum, c) => sum + c.question_count, 0);
  const share = correct / total;
  const rank = levelRank(base);

  if (share >= STRONG_THRESHOLD && rank < LEVELS.length - 1) {
    return {
      level: LEVELS[rank + 1].id,
      levelChange: "up",
      levelNote:
        "You've been doing really well, so we've added lessons that go a little further.",
    };
  }
  if (share < STRUGGLE_THRESHOLD && rank > 0) {
    return {
      level: LEVELS[rank - 1].id,
      levelChange: "down",
      levelNote:
        "We've picked some gentler lessons to help the last few ideas settle in. There's no rush.",
    };
  }
  return none;
}

/** Adds up scoring rules; the biggest one becomes the reason we show. */
function scorer(fallback: string) {
  let total = 0;
  let best = { points: 0, reason: fallback };
  return {
    add(points: number, reason?: string) {
      total += points;
      if (reason && points > best.points) best = { points, reason };
    },
    result: () => ({ score: total, reason: best.reason }),
  };
}

function ranked<T>(items: { item: T; score: number; reason: string }[]) {
  // Array sort is stable, so equal scores keep the library's order.
  return items
    .sort((a, b) => b.score - a.score)
    .map(({ item, reason }) => ({ item, reason }));
}

export function buildLearningPath({
  plan,
  lessons,
  scenarios,
  completions,
  attempts,
}: {
  plan: LearningPlan | null;
  /** Published lessons in library order. */
  lessons: PathLesson[];
  /** Published scenarios in library order. */
  scenarios: PathScenario[];
  /** This learner's completions, newest first. */
  completions: LessonCompletion[];
  attempts: PracticeAttempt[];
}): LearningPath {
  const levelInfo = adjustLevel(plan?.level ?? "beginner", completions);
  const { level } = levelInfo;
  const planTopics = new Set<TopicId>(plan?.topics ?? []);
  const goals = GOALS.filter((g) => plan?.goals.includes(g.id));
  const goalFor = (topic: TopicId | null) =>
    topic
      ? goals.find((g) => (g.topics as readonly TopicId[]).includes(topic))
      : undefined;

  const lessonsById = new Map(lessons.map((l) => [l.id, l]));
  const best = bestPerLesson(completions).filter((c) =>
    lessonsById.has(c.lesson_id),
  );
  const finishedIds = new Set(best.map((c) => c.lesson_id));
  const struggled = best.filter(
    (c) => c.question_count > 0 && scoreOf(c) < STRUGGLE_THRESHOLD,
  );
  const struggledIds = new Set(struggled.map((c) => c.lesson_id));
  const struggledTopics = new Set(
    struggled
      .map((c) => {
        const lesson = lessonsById.get(c.lesson_id);
        return lesson ? topicOfLesson(lesson) : null;
      })
      .filter((t): t is TopicId => !!t),
  );

  const lessonPicks = lessons
    .filter((l) => !finishedIds.has(l.id))
    .map((lesson) => {
      const s = scorer("A good next step for you");
      const topic = topicOfLesson(lesson);
      if (topic && planTopics.has(topic)) {
        s.add(3, `Because you chose “${topicLabel(topic)}”`);
      }
      const goal = goalFor(topic);
      if (goal) s.add(2, `Helps with your goal: “${goal.label}”`);

      const gap = levelRank(lesson.level) - levelRank(level);
      if (gap === 0) s.add(2);
      else if (gap === -1) s.add(1);
      else if (gap >= 2) s.add(-5);
      if (!plan && gap <= 0 && lesson.level === "beginner") {
        s.add(1, "A good place to start");
      }
      return { item: lesson, ...s.result() };
    });

  const review = struggled.flatMap((c) => {
    const lesson = lessonsById.get(c.lesson_id);
    return lesson
      ? [{ item: lesson, reason: "Reading it again can help it stick." }]
      : [];
  });

  const attempted = new Set(attempts.map((a) => a.scenario_id));
  const practicePicks = scenarios.map((scenario) => {
    const tried = attempted.has(scenario.id);
    const s = scorer(
      tried ? "You can try this one again" : "Something new to try",
    );
    const topic = topicOfScenario(scenario, lessonsById);
    const linked = scenario.lesson_id
      ? lessonsById.get(scenario.lesson_id)
      : undefined;

    if (linked && struggledIds.has(linked.id)) {
      s.add(5, `Practice for “${linked.title}”`);
    } else if (topic && struggledTopics.has(topic)) {
      s.add(3, `More practice with ${topicLabel(topic).toLowerCase()}`);
    }
    if (linked && finishedIds.has(linked.id)) {
      s.add(2, `Goes with “${linked.title}”, which you finished`);
    }
    if (topic && planTopics.has(topic)) {
      s.add(2, `Because you chose “${topicLabel(topic)}”`);
    }
    const goal = goalFor(topic);
    if (goal) s.add(1, `Helps with your goal: “${goal.label}”`);
    if (tried) s.add(-4);
    return { item: scenario, ...s.result() };
  });

  return {
    ...levelInfo,
    lessons: ranked(lessonPicks),
    review,
    practice: ranked(practicePicks),
  };
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export async function loadPlans(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, LearningPlan>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase
    .from("learning_preferences")
    .select("user_id, topics, level, goals")
    .in("user_id", userIds);
  return new Map(
    ((data as LearningPlan[] | null) ?? []).map((p) => [p.user_id, p]),
  );
}

/** Published lessons and scenarios, in library order. */
export async function loadLibrary(supabase: SupabaseClient) {
  const [{ data: lessonRows }, { data: scenarioRows }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, topic, summary, level")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("practice_scenarios")
      .select("id, title, prompt, choices, lesson_id")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  return {
    lessons: (lessonRows as PathLesson[] | null) ?? [],
    scenarios: (scenarioRows as PathScenario[] | null) ?? [],
  };
}

/** Everything a learner's own pages need to show their path. */
export async function loadLearnerPath(
  supabase: SupabaseClient,
  userId: string,
) {
  const [plans, library, progress] = await Promise.all([
    loadPlans(supabase, [userId]),
    loadLibrary(supabase),
    loadProgress(supabase, [userId]),
  ]);
  const plan = plans.get(userId) ?? null;
  const path = buildLearningPath({ plan, ...library, ...progress });
  return { plan, ...library, ...progress, path };
}

export type TopicSuggestion = {
  id: string;
  caregiver_id: string;
  care_recipient_id: string;
  topic: TopicId;
  note: string;
  created_at: string;
};

export async function loadTopicSuggestions(
  supabase: SupabaseClient,
  filter: { caregiverId?: string; recipientId?: string },
): Promise<TopicSuggestion[]> {
  let query = supabase
    .from("topic_suggestions")
    .select("id, caregiver_id, care_recipient_id, topic, note, created_at")
    .order("created_at", { ascending: false });
  if (filter.caregiverId) query = query.eq("caregiver_id", filter.caregiverId);
  if (filter.recipientId)
    query = query.eq("care_recipient_id", filter.recipientId);
  const { data } = await query;
  return (data as TopicSuggestion[] | null) ?? [];
}
