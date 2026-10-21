"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { env } from "~/env";
import { escapeHtml, sendEmail } from "~/lib/email";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

export type GuardianRequestResult = { ok: true } | { ok: false; error: string };

/**
 * The address the approval link points to. Only our own sites are allowed,
 * so a forged request can't send a parent to a look-alike page.
 */
async function trustedOrigin() {
  const site = new URL(env.NEXT_PUBLIC_SITE_URL);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  if (/^localhost(:\d+)?$/.test(host)) return `http://${host}`;
  if (
    host === site.host ||
    /^[a-z0-9-]+-golden-guide\.vercel\.app$/.test(host)
  ) {
    return `https://${host}`;
  }
  return site.origin;
}

/**
 * Emails a 16- or 17-year-old student's parent or guardian a link to
 * approve them. The database makes the link (service role only), so the
 * student never sees it.
 */
export async function requestGuardianApproval(
  email: string,
): Promise<GuardianRequestResult> {
  const parsed = z.string().trim().max(254).email().safeParse(email);
  if (!parsed.success) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Please sign in again." };

  const { data: profile } = await supabase
    .from("student_profiles")
    .select("display_name, age_group, guardian_status")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile || profile.age_group !== "16_17") {
    return {
      ok: false,
      error: "Only students who are 16 or 17 need a parent's approval.",
    };
  }

  const admin = createAdminClient();
  const { data: token, error } = await admin.rpc("create_guardian_consent", {
    p_student: userData.user.id,
    p_email: parsed.data,
  });
  if (error || !token) {
    return {
      ok: false,
      error: error?.message ?? "Something went wrong. Please try again.",
    };
  }

  const link = `${await trustedOrigin()}/guardian/${token as string}`;
  const name = profile.display_name as string;
  try {
    await sendEmail({
      to: parsed.data,
      subject: `${name} would like to volunteer with GoldenGuide`,
      text: [
        "Hello,",
        "",
        `${name} has signed up to volunteer on GoldenGuide, where students help older adults learn everyday skills like video calls, budgeting and spotting scams.`,
        "",
        "Because they're under 18, they need a parent or guardian's approval before they can work with any family. Sessions are by video or phone call, and each family's caregiver decides who their family member learns with.",
        "",
        `Please review and approve or decline here (the link works for 14 days): ${link}`,
        "",
        "If you don't know who this is, you can ignore this email.",
        "",
        "GoldenGuide",
      ].join("\n"),
      html: `<p>Hello,</p>
<p><strong>${escapeHtml(name)}</strong> has signed up to volunteer on GoldenGuide, where students help older adults learn everyday skills like video calls, budgeting and spotting scams.</p>
<p>Because they're under 18, they need a parent or guardian's approval before they can work with any family. Sessions are by video or phone call, and each family's caregiver decides who their family member learns with.</p>
<p><a href="${escapeHtml(link)}">Review and approve or decline</a> (the link works for 14 days).</p>
<p>If you don't know who this is, you can ignore this email.</p>
<p>GoldenGuide</p>`,
    });
  } catch {
    return {
      ok: false,
      error:
        "We couldn't send the email just now. Please try again in a little while.",
    };
  }
  return { ok: true };
}
