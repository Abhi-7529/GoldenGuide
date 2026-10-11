// Caregiver-suggested lessons. A suggestion stays "pending" until the learner
// finishes that lesson after it was suggested.

import { loadProgress } from "~/lib/progress";
import type { createClient } from "~/lib/supabase/server";
import type { LessonCompletion } from "~/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type LessonSuggestion = {
  id: string;
  caregiver_id: string;
  care_recipient_id: string;
  lesson_id: string;
  lesson_title: string | null;
  note: string;
  created_at: string;
  /** When the learner finished the lesson after it was suggested, if they did. */
  finished_at: string | null;
};

export async function loadSuggestions(
  supabase: SupabaseClient,
  filter: { caregiverId?: string; recipientId?: string },
  completions: LessonCompletion[],
): Promise<LessonSuggestion[]> {
  let query = supabase
    .from("lesson_suggestions")
    .select(
      "id, caregiver_id, care_recipient_id, lesson_id, note, created_at, lessons(title)",
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
    const finished = completions
      .filter(
        (c) =>
          c.user_id === row.care_recipient_id &&
          c.lesson_id === row.lesson_id &&
          c.completed_at >= (row.created_at as string),
      )
      .map((c) => c.completed_at)
      .sort()[0];

    return {
      id: row.id as string,
      caregiver_id: row.caregiver_id as string,
      care_recipient_id: row.care_recipient_id as string,
      lesson_id: row.lesson_id as string,
      lesson_title: title ?? null,
      note: row.note as string,
      created_at: row.created_at as string,
      finished_at: finished ?? null,
    };
  });
}

/** Pending suggestions for a learner, one per lesson, newest first. */
export function pendingForLearner(suggestions: LessonSuggestion[]) {
  const seen = new Set<string>();
  return suggestions.filter((s) => {
    // Hide suggestions for lessons that are no longer published.
    if (s.finished_at || !s.lesson_title || seen.has(s.lesson_id)) {
      return false;
    }
    seen.add(s.lesson_id);
    return true;
  });
}

/**
 * Pending suggestions for the signed-in learner, with the suggesting
 * caregiver's name. Used by the learner's Home and Lessons pages.
 */
export async function loadLearnerSuggestions(
  supabase: SupabaseClient,
  userId: string,
  connections: { partner_id: string; partner_full_name: string | null }[],
  /** The learner's completions, if already loaded. */
  loadedCompletions?: LessonCompletion[],
) {
  const completions =
    loadedCompletions ?? (await loadProgress(supabase, [userId])).completions;
  const suggestions = await loadSuggestions(
    supabase,
    { recipientId: userId },
    completions,
  );
  const names = new Map(
    connections.map((c) => [
      c.partner_id,
      c.partner_full_name || "Your caregiver",
    ]),
  );
  return pendingForLearner(suggestions).map((s) => ({
    ...s,
    caregiver_name: names.get(s.caregiver_id) ?? "Your caregiver",
  }));
}
