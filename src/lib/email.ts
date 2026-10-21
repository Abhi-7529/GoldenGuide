import "server-only";

import { env } from "~/env";

/**
 * Sends one email through Resend's API. Without a RESEND_API_KEY the email
 * is printed to the server log in development (so links can be tested
 * locally) and refused in production.
 */
export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === "development") {
      console.info(
        `[email not sent: no RESEND_API_KEY] to=${message.to}\n${message.text}`,
      );
      return;
    }
    throw new Error("Email isn't set up yet.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend refused the email (${response.status}).`);
  }
}

/** Escapes text for use inside an HTML email. */
export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
