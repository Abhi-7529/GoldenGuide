import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { AppChrome } from "~/components/app-chrome";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "GoldenGuide",
  description: "Financial literacy for older adults.",
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
      <body>
        <ThemeProvider>
          <AppChrome>{children}</AppChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
