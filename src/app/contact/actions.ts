"use server";

import { z } from "zod";
import { createClient } from "~/lib/supabase/server";

export type ContactState =
  | { status: "idle" }
  | { status: "sent" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      /** What the person typed, so a failed send doesn't clear the form. */
      values: Record<string, string>;
    };

const schema = z.object({
  kind: z.enum(["organization", "general"]),
  name: z.string().trim().min(1, "Please tell us your name.").max(100),
  email: z
    .string()
    .trim()
    .max(254)
    .email("Please enter a valid email address."),
  organization: z.string().trim().max(150).default(""),
  organization_type: z.string().trim().max(60).default(""),
  message: z
    .string()
    .trim()
    .min(10, "Please write a few more words (at least 10 characters).")
    .max(4000, "Please keep your message under 4,000 characters."),
});

/** Saves a Contact or Organizations message for GoldenGuide admins. */
export async function sendContactMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Bots fill in every field, including this hidden one; people never see it.
  if (formData.get("website")) return { status: "sent" };

  const values = Object.fromEntries(
    ["name", "email", "organization", "organization_type", "message"].map(
      (key) => [key, String(formData.get(key) ?? "")],
    ),
  );
  const parsed = schema.safeParse({ ...values, kind: formData.get("kind") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors,
      values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_inquiries")
    .insert(parsed.data);
  if (error) {
    return {
      status: "error",
      message: error.message.includes("already have your messages")
        ? error.message
        : "We couldn't send your message just now. Please try again in a moment.",
      values,
    };
  }
  return { status: "sent" };
}
