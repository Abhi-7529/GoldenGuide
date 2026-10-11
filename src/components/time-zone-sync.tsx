"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "~/lib/supabase/client";

/** The time zone the person's device is set to, e.g. "America/Chicago". */
export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Keeps the saved time zone in step with the device, so "today" (daily
 * lessons) follows the person's own day, even after they travel. Reads the
 * device setting, so there's no location prompt. Renders nothing.
 */
export function TimeZoneSync({ saved }: { saved: string }) {
  const router = useRouter();

  useEffect(() => {
    const zone = deviceTimeZone();
    if (!zone || zone === saved) return;
    const supabase = createClient();
    void supabase
      .rpc("set_my_time_zone", { p_zone: zone })
      .then(({ error }) => {
        if (!error) router.refresh();
      });
  }, [saved, router]);

  return null;
}
