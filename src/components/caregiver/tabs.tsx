"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

const tabs = [
  { href: "/caregiver/progress", label: "Learning Progress" },
  { href: "/caregiver/activity", label: "Activity" },
  { href: "/caregiver/budgets", label: "Budgets" },
  { href: "/caregiver/connection", label: "Manage Connection" },
  { href: "/caregiver/membership", label: "Membership" },
];

export function CaregiverTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
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
