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
  /** The longest session this family can plan, in minutes. */
  max_minutes: number;
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

/** The usual session length, and the longest on the Free plan. */
export const PLANNED_MINUTES = 30;

/** The longest session with GoldenGuide Family (max_planned_minutes). */
export const FAMILY_MAX_MINUTES = 120;

/** Lengths offered when planning, up to the family's limit. */
export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

/** Session notes limits, matching community_note_limit() in the database. */
export const NOTE_LIMITS = { body: 2000, nextSteps: 1000 };

export type MeetingProvider =
  | "zoom"
  | "google_meet"
  | "teams"
  | "webex"
  | "jitsi"
  | "whereby";

export const MEETING_PROVIDER_LABELS: Record<MeetingProvider, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Microsoft Teams",
  webex: "Webex",
  jitsi: "Jitsi Meet",
  whereby: "Whereby",
};

/**
 * The provider for an allowed meeting link, or null. Mirrors the database's
 * meeting_provider(), which has the final say: https only, a known meeting
 * service's own address, no user:password@ or custom port.
 */
export function meetingProvider(url: string): MeetingProvider | null {
  const value = url.trim();
  if (!/^https:\/\/\S+$/i.test(value) || value.length > 500) return null;
  const authority = value.slice(8).split(/[/?#]/)[0]?.toLowerCase() ?? "";
  if (!authority || /[@:\\]/.test(authority)) return null;
  if (authority === "zoom.us" || /^[a-z0-9-]+\.zoom\.us$/.test(authority)) {
    return "zoom";
  }
  if (authority === "meet.google.com") return "google_meet";
  if (authority === "teams.microsoft.com" || authority === "teams.live.com") {
    return "teams";
  }
  if (/^([a-z0-9-]+\.)?webex\.com$/.test(authority)) return "webex";
  if (authority === "meet.jit.si") return "jitsi";
  if (
    authority === "whereby.com" ||
    /^[a-z0-9-]+\.whereby\.com$/.test(authority)
  ) {
    return "whereby";
  }
  return null;
}

export const MEETING_LINK_HELP =
  "Paste a link from Zoom, Google Meet, Microsoft Teams, Webex, Jitsi Meet or Whereby. It must start with https://.";

/** Free video services can end calls early (Zoom's free plan stops at 40 minutes). */
export const MEETING_PROVIDER_LIMITS_NOTE =
  "Some free video plans end calls early (Zoom's free plan stops group calls at 40 minutes). For longer sessions, check the service's limits or plan to reconnect.";

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
  verified_by_role: "caregiver" | "learner" | "admin" | null;
  meeting_url: string | null;
  premium_at_booking: boolean;
  created_at: string;
};

export const SESSION_COLUMNS =
  "id, caregiver_id, student_id, learner_id, caregiver_name, student_name, learner_name, topic, description, format, join_details, scheduled_at, planned_minutes, actual_minutes, activity_notes, status, requested_by, learner_response, caregiver_note, submitted_at, verified_at, verified_by_name, verified_by_role, meeting_url, premium_at_booking, created_at";

/** A student's notes on a session. Private until shared. */
export type SessionNotes = {
  session_id: string;
  body: string;
  next_steps: string;
  shared_at: string | null;
  updated_at: string;
};

/** Sessions a student can keep notes on. */
export const NOTES_STATUSES: SessionStatus[] = [
  "scheduled",
  "pending_verification",
  "correction_requested",
  "verified",
  "disputed",
];

export const VERIFIED_BY_LABELS = {
  caregiver: "Caregiver",
  learner: "Learner",
  admin: "GoldenGuide review",
} as const;

/** What happened, after the actor's name ("Student logged their time"). */
export const EVENT_LABELS: Record<string, string> = {
  created: "planned the session",
  requested: "asked for the session",
  approve: "approved it",
  reject: "declined the request",
  accept: "accepted",
  decline: "declined",
  cancel: "canceled it",
  canceled: "canceled it",
  updated: "updated the details",
  rescheduled: "changed the time",
  submitted: "logged their time",
  resubmitted: "changed the logged time",
  verify: "verified the time",
  request_correction: "asked for a correction",
  dispute: "disputed the record",
  learner_yes: "said they'd like this session",
  learner_declined: "said not this time",
  learner_confirmed: "confirmed the time",
  learner_disputed: "disputed the time",
  meeting_link_set: "added or changed the meeting link",
  meeting_link_removed: "removed the meeting link",
  notes_shared: "shared their session notes",
  notes_unshared: "stopped sharing their session notes",
  not_held: "reported the session didn't happen",
  admin_verified: "verified the time after a review",
  admin_upheld_dispute: "reviewed the dispute and didn't count the time",
};

export type SessionEvent = {
  id: string;
  actor_role: "caregiver" | "student" | "learner" | "admin";
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
  pending_verification: "Awaiting confirmation",
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
    pending_verification: "Confirm the time",
  },
  student: {
    invited: "Needs your answer",
    pending_verification: "Awaiting confirmation",
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
  "Each entry was confirmed by the caregiver or learner named on it (or, after a disagreement, by GoldenGuide's review). This is their confirmation, not certification by GoldenGuide, a school or an organization.";

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
