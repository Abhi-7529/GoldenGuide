"use client";

import { useEffect, useState } from "react";
import { IconArrowRight } from "~/components/icons";
import { Button } from "~/components/ui/button";
import {
  MEETING_PROVIDER_LABELS,
  meetingProvider,
  type Session,
} from "~/lib/community";
import { cn } from "~/lib/utils";

/** Opens from 30 minutes before the start until an hour after the end. */
const OPEN_BEFORE_MS = 30 * 60_000;
const OPEN_AFTER_MS = 60 * 60_000;

function windowState(
  session: Pick<Session, "scheduled_at" | "planned_minutes">,
) {
  const start = new Date(session.scheduled_at).getTime();
  const end = start + session.planned_minutes * 60_000;
  const now = Date.now();
  if (now < start - OPEN_BEFORE_MS) return "early" as const;
  if (now > end + OPEN_AFTER_MS) return "over" as const;
  return "open" as const;
}

/**
 * The big button that opens the session's video call in a new tab. Only
 * shown for confirmed sessions with a link the app recognizes.
 */
export function JoinMeetingButton({
  session,
  large = false,
}: {
  session: Pick<
    Session,
    "meeting_url" | "status" | "scheduled_at" | "planned_minutes"
  >;
  /** Bigger text and button, for learners. */
  large?: boolean;
}) {
  // Recheck every half minute so the button switches on at the right time.
  const [state, setState] = useState(() => windowState(session));
  useEffect(() => {
    const timer = setInterval(() => setState(windowState(session)), 30_000);
    return () => clearInterval(timer);
  }, [session]);

  if (session.status !== "scheduled" || !session.meeting_url) return null;
  const provider = meetingProvider(session.meeting_url);
  // A link the app doesn't recognize is never offered as a button.
  if (!provider) return null;
  const label = MEETING_PROVIDER_LABELS[provider];

  if (state === "over") return null;

  return (
    <div className="flex flex-col gap-2">
      {state === "open" ? (
        <Button
          asChild
          size="xl"
          className={cn("w-full sm:w-fit", large && "h-16 px-10 text-xl")}
        >
          <a
            href={session.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            Join Meeting on {label}
            <IconArrowRight />
          </a>
        </Button>
      ) : (
        <Button
          size="xl"
          disabled
          className={cn("w-full sm:w-fit", large && "h-16 px-10 text-xl")}
        >
          Join Meeting on {label}
        </Button>
      )}
      <p className={cn("text-muted-foreground", large ? "text-lg" : "text-sm")}>
        {state === "open"
          ? `Opens ${label} in a new tab. Come back here afterwards.`
          : "This button turns on 30 minutes before the session starts."}
      </p>
    </div>
  );
}
