"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/lessons", label: "Lessons" },
  { href: "/admin/scenarios", label: "Scenarios" },
  { href: "/admin/simulations", label: "Scam Simulations" },
  { href: "/admin/usage", label: "Usage" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
