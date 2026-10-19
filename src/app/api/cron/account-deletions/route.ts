import { env } from "~/env";
import { runDueDeletions } from "~/lib/account-deletion";

// Daily backup for scheduled account deletions (see vercel.json), in case a
// Stripe webhook was missed. Vercel sends CRON_SECRET as a bearer token.
export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return new Response("Cron secret is not configured.", { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized.", { status: 401 });
  }

  try {
    return Response.json(await runDueDeletions());
  } catch (error) {
    console.error(
      "Scheduled deletion run failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return new Response("Run failed.", { status: 500 });
  }
}
