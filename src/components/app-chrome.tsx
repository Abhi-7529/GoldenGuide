"use client";

import { usePathname } from "next/navigation";
import { Footer } from "~/components/landing/footer";
import { Navbar } from "~/components/navbar";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMarketing = pathname === "/";
  const isPublic =
    isMarketing ||
    ["/organizations", "/contact", "/help", "/privacy", "/terms"].includes(
      pathname,
    );

  return (
    <>
      <Navbar variant={isMarketing ? "marketing" : "app"} />
      {children}
      {isPublic && <Footer />}
    </>
  );
}
