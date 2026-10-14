// Loads learning progress and turns it into plain-language summaries.
// Summaries are built from templates, not AI, so they're free and always match
// the recorded data.

import type { createClient } from "~/lib/supabase/server";
import type {
  LessonCompletion,
  PracticeAttempt,
  SimulationAttempt,
} from "~/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Scores below this share of correct answers are flagged as "harder". */
export const STRUGGLE_THRESHOLD = 0.6;
export const STRONG_THRESHOLD = 0.8;

export async function loadProgress(
  supabase: SupabaseClient,
  userIds: string[],
  since?: Date,
) {
  if (userIds.length === 0) {
    return { completions: [], attempts: [] };
  }

  let completionsQuery = supabase
    .from("lesson_completions")
    .select(
      "lesson_id, user_id, correct_count, question_count, completed_at, lessons(title)",
    )
    .in("user_id", userIds)
    .order("completed_at", { ascending: false });

  let attemptsQuery = supabase
    .from("usage_events")
    .select("user_id, ref_id, created_at")
    .eq("kind", "scenario_attempt")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });

  if (since) {
    completionsQuery = completionsQuery.gte(
      "completed_at",
      since.toISOString(),
    );
    attemptsQuery = attemptsQuery.gte("created_at", since.toISOString());
  }

  const [{ data: completionRows }, { data: attemptRows }] = await Promise.all([
    completionsQuery,
    attemptsQuery,
  ]);

  const completions: LessonCompletion[] = (completionRows ?? []).map((row) => {
    const lesson = row.lessons as
      | { title: string }
      | { title: string }[]
      | null;
    const title = Array.isArray(lesson) ? lesson[0]?.title : lesson?.title;
    return {
      lesson_id: row.lesson_id as string,
      user_id: row.user_id as string,
      correct_count: row.correct_count as number,
      question_count: row.question_count as number,
      completed_at: row.completed_at as string,
      lesson_title: title ?? null,
    };
  });

  const scenarioIds = [
    ...new Set((attemptRows ?? []).map((r) => r.ref_id as string)),
  ];
  const { data: scenarioRows } = scenarioIds.length
    ? await supabase
        .from("practice_scenarios")
        .select("id, title")
        .in("id", scenarioIds)
    : { data: [] };
  const scenarioTitles = new Map(
    (scenarioRows ?? []).map((s) => [s.id as string, s.title as string]),
  );

  const attempts: PracticeAttempt[] = (attemptRows ?? []).map((row) => ({
    user_id: row.user_id as string,
    scenario_id: row.ref_id as string,
    created_at: row.created_at as string,
    scenario_title: scenarioTitles.get(row.ref_id as string) ?? null,
  }));

  return { completions, attempts };
}

/** The best result per lesson, newest first. Retakes keep the highest score. */
export function bestPerLesson(completions: LessonCompletion[]) {
  const best = new Map<string, LessonCompletion>();
  for (const c of completions) {
    const current = best.get(c.lesson_id);
    if (!current || scoreOf(c) > scoreOf(current)) {
      best.set(c.lesson_id, c);
    }
  }
  return [...best.values()].sort((a, b) =>
    b.completed_at.localeCompare(a.completed_at),
  );
}

export function scoreOf(c: LessonCompletion) {
  return c.question_count === 0 ? 1 : c.correct_count / c.question_count;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function listTitles(titles: string[]) {
  const quoted = titles.map((t) => `“${t}”`);
  if (quoted.length <= 1) return quoted.join("");
  return `${quoted.slice(0, -1).join(", ")} and ${quoted.at(-1)}`;
}

export type WeeklySummary = {
  active: boolean;
  sentences: string[];
  /** A gentle suggestion for the caregiver, if there is one. */
  suggestion: string | null;
};

/** Builds a short, plain-English summary of one learner's past week. */
export function buildWeeklySummary(
  name: string,
  completions: LessonCompletion[],
  attempts: PracticeAttempt[],
  simulationAttempts: SimulationAttempt[] = [],
): WeeklySummary {
  if (
    completions.length === 0 &&
    attempts.length === 0 &&
    simulationAttempts.length === 0
  ) {
    return {
      active: false,
      sentences: [
        `${name} hasn't done any lessons or practice in the past 7 days.`,
      ],
      suggestion:
        "A friendly call or message might help them get started again.",
    };
  }

  const sentences: string[] = [];
  const lessons = bestPerLesson(completions);

  if (lessons.length > 0) {
    const titles = lessons.map((l) => l.lesson_title ?? "a lesson");
    sentences.push(
      `${name} finished ${plural(lessons.length, "lesson")}: ${listTitles(titles)}.`,
    );

    const correct = lessons.reduce((sum, l) => sum + l.correct_count, 0);
    const total = lessons.reduce((sum, l) => sum + l.question_count, 0);
    if (total > 0) {
      sentences.push(
        `They answered ${correct} of ${plural(total, "question")} correctly.`,
      );
    }
  }

  if (attempts.length > 0) {
    const situations = new Set(attempts.map((a) => a.scenario_id)).size;
    const subject = sentences.length > 0 ? "They" : name;
    sentences.push(
      `${subject} practiced ${plural(situations, "money situation")}.`,
    );
  }

  if (simulationAttempts.length > 0) {
    // First answer per pretend scam, as in the Scam Practice score.
    const first = new Map<string, SimulationAttempt>();
    for (const a of [...simulationAttempts].sort((x, y) =>
      x.created_at.localeCompare(y.created_at),
    )) {
      if (!first.has(a.simulation_id)) first.set(a.simulation_id, a);
    }
    const tried = first.size;
    const safe = [...first.values()].filter((a) => a.is_safe).length;
    const subject = sentences.length > 0 ? "They" : name;
    sentences.push(
      `${subject} tried ${plural(tried, "pretend scam")} and picked the safe choice first time in ${safe}.`,
    );
  }

  const harder = lessons.filter(
    (l) => l.question_count > 0 && scoreOf(l) < STRUGGLE_THRESHOLD,
  );
  let suggestion: string | null = null;
  if (harder.length > 0) {
    suggestion = `They found ${listTitles(harder.map((l) => l.lesson_title ?? "a lesson"))} harder. You might go over it together.`;
  } else if (
    lessons.length > 0 &&
    lessons.every((l) => scoreOf(l) >= STRONG_THRESHOLD)
  ) {
    suggestion =
      "They're doing well. A word of encouragement can go a long way.";
  } else if (lessons.length === 0) {
    suggestion =
      "They haven't finished a lesson this week. You could suggest one to try together.";
  }

  return { active: true, sentences, suggestion };
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
