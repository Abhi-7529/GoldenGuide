import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

const EMAIL_LINK_TYPES: EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "email_change",
  "invite",
  "magiclink",
];

/**
 * Where links in GoldenGuide's emails land (sign-up confirmation, password
 * reset, email change). The link carries a one-time token, so it works on
 * any device or browser, not just the one that asked for the email.
 * Google sign-in still returns through /auth/callback.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const type = EMAIL_LINK_TYPES.find((t) => t === typeParam);
  // Only same-site paths, so the link can't send people to another website.
  const nextParam = searchParams.get("next");
  const next =
    nextParam?.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error && data.user) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      const destination = !profile
        ? "/onboarding"
        : profile.role === "caregiver"
          ? "/caregiver"
          : "/home";
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link-expired`);
}
