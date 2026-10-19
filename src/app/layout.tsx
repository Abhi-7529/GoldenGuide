import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { AppChrome } from "~/components/app-chrome";
import { env } from "~/env";
import { PREFERENCES_BOOT_SCRIPT } from "~/lib/preferences";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
});

const description =
  "Simple, friendly money lessons and safe scam practice for older adults, with tools that help family caregivers support them.";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    template: "%s · GoldenGuide",
    default: "GoldenGuide · Money confidence for older adults",
  },
  description,
  applicationName: "GoldenGuide",
  openGraph: {
    type: "website",
    siteName: "GoldenGuide",
    title: "GoldenGuide · Money confidence for older adults",
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "GoldenGuide · Money confidence for older adults",
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${poppins.variable}`}
    >
      <head>
        {/* Saved text size and contrast, applied before the first paint. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed string from our own code
          dangerouslySetInnerHTML={{ __html: PREFERENCES_BOOT_SCRIPT }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AppChrome>{children}</AppChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
