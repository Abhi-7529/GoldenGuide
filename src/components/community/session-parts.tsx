import Link from "next/link";
import { IconArrowLeft, IconArrowRight } from "~/components/icons";
import { Card, CardContent } from "~/components/ui/card";
import {
  EVENT_LABELS,
  FORMAT_LABELS,
  formatMinutes,
  formatSessionTime,
  hasStarted,
  MEETING_PROVIDER_LABELS,
  meetingProvider,
  type Session,
  type SessionEvent,
  type SessionStatus,
  STATUS_LABELS,
  STATUS_TONES,
  type StatusTone,
  VERIFIED_BY_LABELS,
  VIEWER_STATUS_LABELS,
} from "~/lib/community";
import { cn } from "~/lib/utils";

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex w-fit items-center gap-2 text-sm font-medium underline decoration-primary decoration-2 underline-offset-4"
    >
      <IconArrowLeft className="size-4" />
      {children}
    </Link>
  );
}

const TONE_CLASSES: Record<StatusTone, string> = {
  action: "bg-tile-teal text-tile-teal-foreground",
  waiting: "bg-tile-amber text-tile-amber-foreground",
  good: "bg-tile-green text-tile-green-foreground",
  warning: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

export type Viewer = "caregiver" | "student";

export function SessionStatusBadge({
  status,
  viewer,
  timePassed = false,
  className,
}: {
  status: SessionStatus;
  viewer: Viewer;
  /** The start time has gone by. */
  timePassed?: boolean;
  className?: string;
}) {
  // An invitation or request nobody answered in time can't go ahead.
  if (timePassed && (status === "invited" || status === "pending_approval")) {
    return (
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
          TONE_CLASSES.muted,
          className,
        )}
      >
        Time passed
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASSES[STATUS_TONES[status]],
        className,
      )}
    >
      {VIEWER_STATUS_LABELS[viewer][status] ?? STATUS_LABELS[status]}
    </span>
  );
}

/** One line per session in a list; the whole row links to its page. */
export function SessionRow({
  session,
  href,
  timeZone,
  who,
  viewer,
}: {
  session: Session;
  href: string;
  timeZone: string;
  viewer: Viewer;
  /** "with Leo", "Sky with Leo", ... */
  who: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{session.topic}</span>
        <span
          className="text-sm text-muted-foreground"
          suppressHydrationWarning
        >
          {who} · {formatSessionTime(session.scheduled_at, timeZone)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <SessionStatusBadge
          status={session.status}
          viewer={viewer}
          timePassed={hasStarted(session)}
        />
        <IconArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export function SessionList({
  title,
  sessions,
  empty,
  children,
}: {
  title: string;
  sessions: Session[];
  empty?: string;
  children: (session: Session) => React.ReactNode;
}) {
  if (sessions.length === 0 && !empty) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            {empty}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">{sessions.map(children)}</div>
      )}
    </section>
  );
}

/** The facts of a session, for caregiver and student pages. */
export function SessionFacts({
  session,
  timeZone,
  showJoinDetails = true,
}: {
  session: Session;
  timeZone: string;
  showJoinDetails?: boolean;
}) {
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">
      <dt className="text-muted-foreground">When</dt>
      <dd suppressHydrationWarning>
        {formatSessionTime(session.scheduled_at, timeZone)}
      </dd>
      <dt className="text-muted-foreground">Planned length</dt>
      <dd>{formatMinutes(session.planned_minutes)}</dd>
      <dt className="text-muted-foreground">Student</dt>
      <dd>{session.student_name}</dd>
      <dt className="text-muted-foreground">Learner</dt>
      <dd>{session.learner_name}</dd>
      <dt className="text-muted-foreground">How</dt>
      <dd>{FORMAT_LABELS[session.format]}</dd>
      {showJoinDetails && (
        <>
          <dt className="text-muted-foreground">Meeting</dt>
          <dd>
            {session.meeting_url ? (
              (MEETING_PROVIDER_LABELS[
                meetingProvider(session.meeting_url) ?? "zoom"
              ] ?? "Video call")
            ) : (
              <span className="text-muted-foreground">
                No meeting link yet.
              </span>
            )}
          </dd>
          {session.join_details && (
            <>
              <dt className="text-muted-foreground">Joining notes</dt>
              <dd>{session.join_details}</dd>
            </>
          )}
        </>
      )}
      {session.description && (
        <>
          <dt className="text-muted-foreground">Details</dt>
          <dd className="whitespace-pre-line">{session.description}</dd>
        </>
      )}
      {session.actual_minutes !== null && (
        <>
          <dt className="text-muted-foreground">Time given</dt>
          <dd>{formatMinutes(session.actual_minutes)}</dd>
        </>
      )}
      {session.activity_notes && (
        <>
          <dt className="text-muted-foreground">What was taught</dt>
          <dd className="whitespace-pre-line">{session.activity_notes}</dd>
        </>
      )}
      {session.verified_by_name && session.verified_at && (
        <>
          <dt className="text-muted-foreground">Verified by</dt>
          <dd suppressHydrationWarning>
            {session.verified_by_name}
            {session.verified_by_role &&
              session.verified_by_role !== "admin" &&
              ` (${VERIFIED_BY_LABELS[session.verified_by_role].toLowerCase()})`}{" "}
            on{" "}
            {new Date(session.verified_at).toLocaleDateString("en-US", {
              timeZone,
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </dd>
        </>
      )}
    </dl>
  );
}

const ACTOR_LABELS = {
  caregiver: "Caregiver",
  student: "Student",
  learner: "Learner",
  admin: "GoldenGuide",
} as const;

/** The audit history of a session, newest first. */
export function SessionHistory({
  events,
  timeZone,
}: {
  events: SessionEvent[];
  timeZone: string;
}) {
  if (events.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
      <ol className="flex flex-col gap-2 border-l-2 border-border pl-4">
        {events.map((e) => {
          const minutes = e.details.actual_minutes;
          const note = e.details.note;
          return (
            <li key={e.id} className="text-sm">
              <span className="font-medium">{ACTOR_LABELS[e.actor_role]}</span>{" "}
              {EVENT_LABELS[e.event] ?? e.event}
              {typeof minutes === "number" &&
                (e.event === "submitted" || e.event === "resubmitted") &&
                ` (${formatMinutes(minutes)})`}
              {typeof note === "string" && note && `: “${note}”`}
              <span
                className="block text-xs text-muted-foreground"
                suppressHydrationWarning
              >
                {new Date(e.created_at).toLocaleString("en-US", {
                  timeZone,
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
