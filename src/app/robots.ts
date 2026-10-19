import type { MetadataRoute } from "next";
import { env } from "~/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/organizations", "/contact", "/help", "/privacy", "/terms"],
      // Signed-in areas are private and not useful in search results.
      disallow: [
        "/admin",
        "/api",
        "/auth",
        "/caregiver",
        "/messages",
        "/account",
        "/settings",
        "/onboarding",
        "/home",
        "/learn",
        "/practice",
        "/progress",
        "/budget",
        "/plan",
        "/scam-help",
        "/scam-practice",
        "/reset-password",
      ],
    },
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
