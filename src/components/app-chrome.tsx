"use client";

import { usePathname } from "next/navigation";
import { Footer } from "~/components/landing/footer";
import { Navbar } from "~/components/navbar";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMarketing = pathname === "/";

  return (
    <>
      <Navbar variant={isMarketing ? "marketing" : "app"} />
      {children}
      {isMarketing && <Footer />}
    </>
  );
}
