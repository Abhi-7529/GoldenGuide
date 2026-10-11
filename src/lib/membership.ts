// GoldenGuide plans and the daily lesson allowance. The database enforces
// the same rules (see the add_memberships and add_user_time_zones
// migrations); this module decides what to show so learners never hit those
// limits unexpectedly.

import {
  loadLearnerPath,
  type PathLesson,
  practiceForLessons,
} from "~/lib/learning-plan";
import type { createClient } from "~/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Used until a person's device time zone is saved. Each learner's daily limit
 * follows their own calendar day (profiles.time_zone).
 */
export const DEFAULT_TIME_ZONE = "America/New_York";
export const FREE_DAILY_LESSONS = 5;

export type PlanId = "free" | "family";

const SHARED_FEATURES = [
  "All lessons and practice situations",
  "Personal learning plans that adjust to each learner",
  "Progress tracking and weekly summaries",
];

export const PLANS = {
  free: {
    name: "Free",
    price: "$0",
    learnerLimit: 1,
    features: [
      "Connect with 1 learner",
      `Up to ${FREE_DAILY_LESSONS} lessons a day, chosen by you`,
      "Unlimited practice on the day's lessons",
      ...SHARED_FEATURES,
    ],
  },
  family: {
    name: "GoldenGuide Family",
    price: "$7.99",
    learnerLimit: 3,
    features: [
      "Connect with up to 3 learners",
      "Unlimited lessons every day",
      "Assign lessons to each learner",
      "Unlimited practice on assigned and finished lessons",
      ...SHARED_FEATURES,
    ],
  },
} as const satisfies Record<
  PlanId,
  { name: string; price: string; learnerLimit: number; features: string[] }
>;

/** The day (YYYY-MM-DD) a moment falls on in a time zone. */
export function appDay(
  when: string | Date = new Date(),
  timeZone: string = DEFAULT_TIME_ZONE,
) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(when));
}

export type Membership = {
  plan: PlanId;
  learner_limit: number;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  active_learner_id: string | null;
  /** Connected learners the caregiver can use dashboard tools for. */
  managed_ids: string[];
};

/** The signed-in caregiver's plan, as the database sees it. */
export async function loadMembership(
  supabase: SupabaseClient,
): Promise<Membership> {
  const { data } = await supabase.rpc("my_membership");
  return (
    (data as Membership | null) ?? {
      plan: "free",
      learner_limit: PLANS.free.learnerLimit,
      status: "none",
      current_period_end: null,
      cancel_at_period_end: false,
      active_learner_id: null,
      managed_ids: [],
    }
  );
}

/**
 * The learner's path plus the lessons they can do. A learner with a caregiver
 * only does lessons the caregiver chose: assigned lessons on Family (no daily
 * limit), or today's picks on Free (up to 5). Either way there are none until
 * the caregiver chooses. A learner on their own gets the top lessons from
 * their learning plan, up to the daily limit. Practice follows the lessons.
 */
export async function loadLearnerDay(supabase: SupabaseClient, userId: string) {
  // The database decides the learner's today from their saved time zone.
  const { data: accessData } = await supabase.rpc("my_learning_access");
  const access = accessData as {
    unlimited?: boolean;
    /** Has a caregiver who picks their lessons. */
    managed?: boolean;
    today?: string;
    time_zone?: string;
  } | null;
  const timeZone = access?.time_zone ?? DEFAULT_TIME_ZONE;
  const today = access?.today ?? appDay(new Date(), timeZone);
  const [learner, { data: pickRows }, { data: assigned }] = await Promise.all([
    loadLearnerPath(supabase, userId),
    supabase
      .from("daily_lessons")
      .select("lesson_id, caregiver_id")
      .eq("care_recipient_id", userId)
      .eq("day", today)
      .order("created_at", { ascending: true }),
    supabase
      .from("lesson_suggestions")
      .select("lesson_id, note")
      .eq("care_recipient_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  const unlimited = access?.unlimited;
  const lessonsById = new Map(learner.lessons.map((l) => [l.id, l]));
  const doneToday = new Set(
    learner.completions
      .filter((c) => appDay(c.completed_at, timeZone) === today)
      .map((c) => c.lesson_id),
  );

  if (unlimited) {
    // Family: the caregiver's assigned lessons, not done first.
    const finished = new Set(learner.completions.map((c) => c.lesson_id));
    const notes = new Map<string, string>();
    for (const a of assigned ?? []) {
      if (a.note) notes.set(a.lesson_id as string, a.note as string);
    }
    const assignedIds = [
      ...new Set((assigned ?? []).map((a) => a.lesson_id as string)),
    ].filter((id) => lessonsById.has(id));
    const ordered = [
      ...assignedIds.filter((id) => !finished.has(id)),
      ...assignedIds.filter((id) => finished.has(id)),
    ];
    return {
      ...learner,
      unlimited: true as const,
      todayLessons: ordered
        .map((id) => lessonsById.get(id))
        .filter((l): l is PathLesson => !!l),
      /** The caregiver who picked today's lessons, if one did. */
      pickedBy: null,
      waitingForCaregiver: assignedIds.length === 0,
      /** Lessons that count as done: ever on Family, today on Free. */
      done: finished,
      notes,
      doneToday,
      practice: practiceForLessons(
        learner.path.practice,
        learner.lessons,
        assignedIds,
      ),
    };
  }

  const pickIds = (pickRows ?? [])
    .map((p) => p.lesson_id as string)
    .filter((id) => lessonsById.has(id));
  const managed = access?.managed ?? false;
  const todayIds =
    pickIds.length > 0 || managed
      ? pickIds
      : [
          ...[...doneToday].filter((id) => lessonsById.has(id)),
          ...learner.path.lessons
            .map((l) => l.item.id)
            .filter((id) => !doneToday.has(id)),
        ].slice(0, FREE_DAILY_LESSONS);
  const todayLessons = todayIds
    .map((id) => lessonsById.get(id))
    .filter((l): l is PathLesson => !!l);

  return {
    ...learner,
    unlimited: false as const,
    todayLessons,
    pickedBy:
      pickIds.length > 0
        ? (((pickRows ?? [])[0]?.caregiver_id as string | undefined) ?? null)
        : null,
    /** Their caregiver hasn't picked today's lessons yet. */
    waitingForCaregiver: managed && pickIds.length === 0,
    done: doneToday,
    notes: new Map<string, string>(),
    doneToday,
    practice: practiceForLessons(
      learner.path.practice,
      learner.lessons,
      todayIds,
    ),
  };
}

export type LearnerDay = Awaited<ReturnType<typeof loadLearnerDay>>;

/** Whether the learner may open this lesson now. */
export function canOpenLesson(day: LearnerDay, lessonId: string) {
  return (
    day.doneToday.has(lessonId) ||
    day.todayLessons.some((l) => l.id === lessonId)
  );
}
