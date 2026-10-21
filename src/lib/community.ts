// Community Skill Exchange: shared types and labels. The database enforces
// every rule (see the community_skill_exchange migration); this module only
// shapes what pages show.

/** One of a student's communities, from my_student_communities(). */
export type StudentCommunity = {
  caregiver_id: string;
  /** First name only. */
  caregiver_name: string;
  status: "active" | "removed";
  joined_at: string;
  /** Learners the caregiver approved, by first name. Empty once removed. */
  learners: { id: string; name: string }[];
};

/** The result of redeem_student_invitation(). */
export type RedeemResult =
  | { ok: true; caregiver_name: string; needs_guardian?: boolean }
  | { ok: false; error: string };

/** Whether a parent or guardian has approved a 16- or 17-year-old. */
export type GuardianStatus = "not_needed" | "pending" | "approved" | "declined";

/** Invitation codes are shown as XXXXX-XXXXX; people may type them any way. */
export const INVITATION_CODE_PLACEHOLDER = "e.g. HA2PY-D7SH4";

export const SKILL_CATEGORIES = {
  technology: "Technology",
  money: "Money and budgeting",
  scams: "Scam awareness",
  cooking: "Cooking",
  art: "Art",
  other: "Other",
} as const;

export type SkillCategory = keyof typeof SKILL_CATEGORIES;

export type StudentSkill = {
  id: string;
  category: SkillCategory;
  title: string;
  description: string;
};

/** A caregiver's student invitation. The code itself is never stored. */
export type Invitation = {
  id: string;
  label: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
  consumed_by: string | null;
  revoked_at: string | null;
};

export type InvitationState = "open" | "used" | "canceled" | "expired";

export function invitationState(
  invitation: Invitation,
  now = Date.now(),
): InvitationState {
  if (invitation.consumed_at) return "used";
  if (invitation.revoked_at) return "canceled";
  if (new Date(invitation.expires_at).getTime() <= now) return "expired";
  return "open";
}

/** A student in a caregiver's community, as the caregiver sees them. */
export type CommunityStudent = {
  id: string;
  status: "active" | "removed";
  joined_at: string;
  removed_at: string | null;
  display_name: string;
  intro: string;
  availability: string;
  interests: string;
  skills: StudentSkill[];
  /** Learners this student may work with. */
  learner_ids: string[];
  /** 18 or older, or approved by a parent or guardian. */
  cleared: boolean;
  guardian_status: GuardianStatus;
};

/** Mirrors the database's student_cleared(). */
export function isCleared(profile: {
  age_group: string | null;
  guardian_status: string;
}) {
  return (
    profile.age_group === "18_plus" || profile.guardian_status === "approved"
  );
}

/** A learner connected to the caregiver. */
export type CommunityLearner = { id: string; name: string };

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------

/** Every session is 30 minutes for now (the database's max_planned_minutes). */
export const PLANNED_MINUTES = 30;

export type SessionStatus =
  | "pending_approval"
  | "invited"
  | "scheduled"
  | "pending_verification"
  | "correction_requested"
  | "verified"
  | "disputed"
  | "rejected"
  | "canceled";

export type SessionFormat = "remote" | "supervised_in_person";

export const FORMAT_LABELS: Record<SessionFormat, string> = {
  remote: "Remote (video or phone call)",
  supervised_in_person: "In person, with a trusted adult there",
};

export type Session = {
  id: string;
  caregiver_id: string | null;
  student_id: string;
  learner_id: string | null;
  caregiver_name: string;
  student_name: string;
  learner_name: string;
  topic: string;
  description: string;
  format: SessionFormat;
  join_details: string;
  scheduled_at: string;
  planned_minutes: number;
  actual_minutes: number | null;
  activity_notes: string;
  status: SessionStatus;
  requested_by: "caregiver" | "student";
  learner_response: "pending" | "yes" | "no";
  caregiver_note: string;
  submitted_at: string | null;
  verified_at: string | null;
  verified_by_name: string | null;
  created_at: string;
};

export const SESSION_COLUMNS =
  "id, caregiver_id, student_id, learner_id, caregiver_name, student_name, learner_name, topic, description, format, join_details, scheduled_at, planned_minutes, actual_minutes, activity_notes, status, requested_by, learner_response, caregiver_note, submitted_at, verified_at, verified_by_name, created_at";

export type SessionEvent = {
  id: string;
  actor_role: "caregiver" | "student" | "learner";
  event: string;
  from_status: SessionStatus | null;
  to_status: SessionStatus | null;
  details: Record<string, unknown>;
  created_at: string;
};

/** What each status means, worded for whoever is looking. */
export const STATUS_LABELS: Record<SessionStatus, string> = {
  pending_approval: "Waiting for caregiver",
  invited: "Waiting for student",
  scheduled: "Scheduled",
  pending_verification: "Time logged, waiting for check",
  correction_requested: "Needs a correction",
  verified: "Verified",
  disputed: "Disputed",
  rejected: "Declined",
  canceled: "Canceled",
};

/** Wording for the person the status is waiting on. */
export const VIEWER_STATUS_LABELS: Record<
  "caregiver" | "student",
  Partial<Record<SessionStatus, string>>
> = {
  caregiver: {
    pending_approval: "Needs your approval",
    pending_verification: "Time to check",
  },
  student: {
    invited: "Needs your answer",
    pending_verification: "Waiting for check",
    correction_requested: "Needs your fix",
  },
};

/** Statuses where the caregiver's note explains what happened. */
export const NOTE_STATUSES: SessionStatus[] = [
  "correction_requested",
  "disputed",
  "rejected",
  "canceled",
];

export type StatusTone = "action" | "waiting" | "good" | "muted" | "warning";

export const STATUS_TONES: Record<SessionStatus, StatusTone> = {
  pending_approval: "waiting",
  invited: "waiting",
  scheduled: "action",
  pending_verification: "waiting",
  correction_requested: "warning",
  verified: "good",
  disputed: "warning",
  rejected: "muted",
  canceled: "muted",
};

/** Upcoming and not yet logged. */
export const OPEN_STATUSES: SessionStatus[] = [
  "pending_approval",
  "invited",
  "scheduled",
];

export function hasStarted(session: Pick<Session, "scheduled_at">) {
  return new Date(session.scheduled_at).getTime() <= Date.now();
}

/** "Tuesday, October 21 at 4:00 PM" in the viewer's saved time zone. */
export function formatSessionTime(iso: string, timeZone: string) {
  const when = new Date(iso);
  const day = when.toLocaleDateString("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const time = when.toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} at ${time}`;
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return rest === 0 ? h : `${h} ${rest} min`;
}

// ---------------------------------------------------------------------------
// volunteer hours
// ---------------------------------------------------------------------------

/** Shown on every service record, on screen, printed and in the CSV. */
export const SERVICE_RECORD_DISCLAIMER =
  "GoldenGuide documents completed community service activities. Acceptance of volunteer hours is determined by the student's school or volunteer organization.";

export const VERIFICATION_NOTE =
  "Each entry was confirmed by the caregiver named on it. This is that caregiver's confirmation, not certification by GoldenGuide, a school or an organization.";

/** Hours with up to two decimals, the way schools usually count them. */
export function formatHours(minutes: number) {
  const hours = Math.round((minutes / 60) * 100) / 100;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** Only verified time counts; logged time waiting for a caregiver is pending. */
export function summarizeHours(sessions: Session[]) {
  const verified = sessions.filter((s) => s.status === "verified");
  const pending = sessions.filter(
    (s) =>
      s.status === "pending_verification" ||
      s.status === "correction_requested",
  );
  const minutes = (list: Session[]) =>
    list.reduce((sum, s) => sum + (s.actual_minutes ?? 0), 0);
  return {
    verified,
    pending,
    verifiedMinutes: minutes(verified),
    pendingMinutes: minutes(pending),
  };
}
