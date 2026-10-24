// Server-side loaders for the Community Skill Exchange. RLS decides what
// each person can read: caregivers, students and learners each only get
// sessions they're part of.

import {
  SESSION_COLUMNS,
  type Session,
  type SessionEvent,
  type SessionNotes,
} from "~/lib/community";
import { DEFAULT_TIME_ZONE } from "~/lib/membership";
import type { createClient } from "~/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** The viewer's saved time zone, so times show in their own clock. */
export async function loadTimeZone(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("time_zone")
    .eq("id", userId)
    .maybeSingle();
  return (data?.time_zone as string | undefined) ?? DEFAULT_TIME_ZONE;
}

/** Sessions the viewer can see, soonest first. */
export async function loadSessions(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("community_sessions")
    .select(SESSION_COLUMNS)
    .order("scheduled_at", { ascending: true });
  return (data as Session[] | null) ?? [];
}

/** One session and its history (history is empty for learners). */
export async function loadSession(supabase: SupabaseClient, id: string) {
  const [{ data: session }, { data: events }] = await Promise.all([
    supabase
      .from("community_sessions")
      .select(SESSION_COLUMNS)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("session_events")
      .select(
        "id, actor_role, event, from_status, to_status, details, created_at",
      )
      .eq("session_id", id)
      .order("created_at", { ascending: false }),
  ]);
  return {
    session: session as Session | null,
    events: (events as SessionEvent[] | null) ?? [],
  };
}

/** Notes the viewer can read for these sessions (RLS: own, or shared). */
export async function loadNotes(
  supabase: SupabaseClient,
  sessionIds: string[],
) {
  if (sessionIds.length === 0) return new Map<string, SessionNotes>();
  const { data } = await supabase
    .from("session_notes")
    .select("session_id, body, next_steps, shared_at, updated_at")
    .in("session_id", sessionIds);
  return new Map(
    ((data as SessionNotes[] | null) ?? []).map((n) => [n.session_id, n]),
  );
}
