"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar, isActive, type NavItem } from "~/components/app-sidebar";
import {
  IconBarChart,
  IconCalculator,
  IconPiggyBank,
  IconTrendingUp,
  IconUsers,
} from "~/components/icons";
import { cn } from "~/lib/utils";

const tabs: NavItem[] = [
  {
    href: "/caregiver/progress",
    label: "Learning Progress",
    icon: IconTrendingUp,
  },
  { href: "/caregiver/activity", label: "Activity", icon: IconBarChart },
  { href: "/caregiver/budgets", label: "Budgets", icon: IconCalculator },
  {
    href: "/caregiver/connection",
    label: "Manage Connection",
    icon: IconUsers,
  },
  { href: "/caregiver/membership", label: "Membership", icon: IconPiggyBank },
];

export function CaregiverSidebar() {
  return <AppSidebar items={tabs} label="Caregiver" />;
}

export function CaregiverTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Caregiver"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden"
    >
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
