import type { MetadataRoute } from "next";
import { env } from "~/env";

const PUBLIC_PATHS = [
  "",
  "/organizations",
  "/contact",
  "/help",
  "/signup",
  "/login",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${env.NEXT_PUBLIC_SITE_URL}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
