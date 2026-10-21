import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // Server-only Supabase vars can go here if needed
    AI_GATEWAY_API_KEY: z.string().min(1),
    // Writes verified Stripe subscription data. Never expose to the browser.
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    // A full secret key (sk_) or a restricted key (rk_), which Stripe now
    // issues for keys without payout and transfer access.
    STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_/),
    // Optional locally; required for the Stripe webhook endpoint.
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
    // Vercel sends this with its scheduled (cron) requests. Use a long
    // random value; without it the cron endpoint stays switched off.
    CRON_SECRET: z.string().min(1).optional(),
    // Sends app emails, like parent approval requests for student
    // volunteers, through Resend. Without it, those emails are printed to
    // the server log in development and fail in production.
    RESEND_API_KEY: z.string().startsWith("re_").optional(),
    // The sender for app emails; its domain must be verified in Resend.
    EMAIL_FROM: z
      .string()
      .min(3)
      .default("GoldenGuide <no-reply@goldenguidefinance.com>"),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    // The public address of the site, used for sharing links and the sitemap.
    NEXT_PUBLIC_SITE_URL: z
      .string()
      .url()
      .default("https://goldenguide-seven.vercel.app"),
    // A monitored inbox for privacy and legal requests, shown on the Privacy
    // and Terms pages once set. Without it, those pages point to Contact.
    NEXT_PUBLIC_LEGAL_EMAIL: z.string().email().optional(),
    // Community Skill Exchange (student volunteers). Off unless set to
    // "true", so it can ship to Production before it's ready to launch.
    NEXT_PUBLIC_COMMUNITY_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_LEGAL_EMAIL: process.env.NEXT_PUBLIC_LEGAL_EMAIL,
    NEXT_PUBLIC_COMMUNITY_ENABLED: process.env.NEXT_PUBLIC_COMMUNITY_ENABLED,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
