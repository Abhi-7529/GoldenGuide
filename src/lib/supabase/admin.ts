import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";

/**
 * A Supabase client that bypasses RLS. Only use it on the server for writes
 * users must never make themselves, like recording a Stripe subscription.
 */
export function createAdminClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
