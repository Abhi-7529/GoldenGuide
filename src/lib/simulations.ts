// Scam Simulation Center: pretend scam texts, emails, calls and websites that
// learners practice on. Simulations are prewritten by admins (no AI). The
// database grades each answer, and these helpers turn the answers into plain
// progress numbers, level unlocks, and "needs more practice" areas.

import { topicOfLesson } from "~/lib/learning-plan";
import { STRUGGLE_THRESHOLD } from "~/lib/progress";
import type { createClient } from "~/lib/supabase/server";
import type {
  LessonLevel,
  ScamSimulation,
  SimulationAttempt,
  SimulationChannel,
} from "~/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Channel and level ids are also listed in the database check constraints
// (see the add_scam_simulations migration). Change both together.
export const CHANNELS: {
  id: SimulationChannel;
  label: string;
  plural: string;
}[] = [
  { id: "text", label: "Text message", plural: "Text messages" },
  { id: "email", label: "Email", plural: "Emails" },
  { id: "phone", label: "Phone call", plural: "Phone calls" },
  { id: "website", label: "Website", plural: "Websites" },
];

export const SIMULATION_LEVELS: {
  id: LessonLevel;
  label: string;
  description: string;
}[] = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Scams with clear warning signs.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Scams that pretend to be companies you know.",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Polished scams with one small clue.",
  },
];

/** Simulations finished at a level before the next level opens. */
export const UNLOCK_COUNT = 3;
/** Share of safe first answers at a level needed to open the next level. */
export const UNLOCK_ACCURACY = 0.7;

export function channelLabel(id: SimulationChannel) {
  return CHANNELS.find((c) => c.id === id)?.label ?? id;
}

export function levelLabel(id: LessonLevel) {
  return SIMULATION_LEVELS.find((l) => l.id === id)?.label ?? id;
}

/** Only `.example` addresses are allowed: that domain can never be real. */
export const FICTIONAL_URL =
  /^(https?:\/\/)?([a-z0-9-]+\.)*[a-z0-9-]+\.example(\/\S*)?$/i;

type Tally = { completed: number; safe: number };

function accuracy(t: Tally) {
  return t.completed === 0 ? null : t.safe / t.completed;
}

export type SimulationSummary = ReturnType<typeof summarizeSimulations>;

/**
 * Progress from a learner's answers. Only the first answer to each
 * simulation counts toward accuracy, so trying again can't raise the score.
 */
export function summarizeSimulations(attempts: SimulationAttempt[]) {
  const first = new Map<string, SimulationAttempt>();
  for (const a of [...attempts].sort((x, y) =>
    x.created_at.localeCompare(y.created_at),
  )) {
    if (!first.has(a.simulation_id)) first.set(a.simulation_id, a);
  }
  const firsts = [...first.values()];

  const tally = (list: SimulationAttempt[]): Tally => ({
    completed: list.length,
    safe: list.filter((a) => a.is_safe).length,
  });

  const total = tally(firsts);
  const byChannel = new Map(
    CHANNELS.map((c) => [
      c.id,
      tally(firsts.filter((a) => a.channel === c.id)),
    ]),
  );
  const byLevel = new Map(
    SIMULATION_LEVELS.map((l) => [
      l.id,
      tally(firsts.filter((a) => a.level === l.id)),
    ]),
  );

  const scored = CHANNELS.map((c) => {
    const t = byChannel.get(c.id) ?? { completed: 0, safe: 0 };
    return { ...c, ...t, accuracy: accuracy(t) };
  });
  const needsWork = scored.filter(
    (c) =>
      c.completed >= 2 &&
      c.accuracy !== null &&
      c.accuracy < STRUGGLE_THRESHOLD,
  );
  const strong = scored.filter(
    (c) =>
      c.completed >= 2 && c.accuracy !== null && c.accuracy >= UNLOCK_ACCURACY,
  );

  return {
    completed: total.completed,
    safe: total.safe,
    accuracy: accuracy(total),
    completedIds: new Set(first.keys()),
    byChannel,
    byLevel,
    needsWork,
    strong,
  };
}

/** Which levels are open, and a plain-words hint for opening the next one. */
export function unlockedLevels(summary: SimulationSummary) {
  const open: LessonLevel[] = ["beginner"];
  let hint: string | null = null;
  for (let i = 1; i < SIMULATION_LEVELS.length; i++) {
    const previous = SIMULATION_LEVELS[i - 1];
    const level = SIMULATION_LEVELS[i];
    if (!previous || !level) break;
    const t = summary.byLevel.get(previous.id) ?? { completed: 0, safe: 0 };
    const acc = accuracy(t) ?? 0;
    if (t.completed >= UNLOCK_COUNT && acc >= UNLOCK_ACCURACY) {
      open.push(level.id);
      continue;
    }
    hint =
      t.completed < UNLOCK_COUNT
        ? `Finish ${UNLOCK_COUNT - t.completed} more ${previous.label} ${
            UNLOCK_COUNT - t.completed === 1 ? "practice" : "practices"
          } to open ${level.label}.`
        : `Pick the safe choice in most ${previous.label} practices to open ${level.label}. Try a few more.`;
    break;
  }
  return { open, highest: open.at(-1) ?? "beginner", hint };
}

type LessonRef = { id: string; title: string; topic: string };

/**
 * Practice that goes with the learner's current lessons: simulations linked
 * to one of those lessons, or, when a current lesson is about scams and none
 * are linked, unlinked simulations at the levels they have open.
 */
export function simulationsForLessons(
  simulations: ScamSimulation[],
  lessons: LessonRef[],
  openLevels: LessonLevel[],
) {
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const linked = simulations
    .filter((s) => s.lesson_id && byId.has(s.lesson_id))
    .map((s) => ({
      item: s,
      reason: `Goes with your lesson “${byId.get(s.lesson_id ?? "")?.title}”`,
    }));
  if (linked.length > 0) return linked;

  const scamLesson = lessons.find((l) => topicOfLesson(l) === "scams");
  if (!scamLesson) return [];
  return simulations
    .filter((s) => !s.lesson_id && openLevels.includes(s.level))
    .map((s) => ({
      item: s,
      reason: `Goes with your lesson “${scamLesson.title}”`,
    }));
}

export async function loadSimulations(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("scam_simulations")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data as ScamSimulation[] | null) ?? [];
}

export async function loadSimulationAttempts(
  supabase: SupabaseClient,
  userIds: string[],
  since?: Date,
): Promise<SimulationAttempt[]> {
  if (userIds.length === 0) return [];
  let query = supabase
    .from("scam_simulation_attempts")
    .select(
      "user_id, simulation_id, is_safe, channel, level, created_at, scam_simulations(title)",
    )
    .in("user_id", userIds)
    .order("created_at", { ascending: false });
  if (since) query = query.gte("created_at", since.toISOString());
  const { data } = await query;

  return (data ?? []).map((row) => {
    const sim = row.scam_simulations as
      | { title: string }
      | { title: string }[]
      | null;
    const title = Array.isArray(sim) ? sim[0]?.title : sim?.title;
    return {
      user_id: row.user_id as string,
      simulation_id: row.simulation_id as string,
      is_safe: row.is_safe as boolean,
      channel: row.channel as SimulationChannel,
      level: row.level as LessonLevel,
      created_at: row.created_at as string,
      simulation_title: title ?? null,
    };
  });
}

/** "Text messages and Emails" style list for summaries. */
export function listChannels(channels: { plural: string }[]) {
  const names = channels.map((c) => c.plural.toLowerCase());
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
