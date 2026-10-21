"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar, isActive, type NavItem } from "~/components/app-sidebar";
import {
  IconBook,
  IconCheck,
  IconHome,
  IconUser,
  IconUsers,
} from "~/components/icons";
import { cn } from "~/lib/utils";

// The overview is exact-match only, so it isn't highlighted on every
// /student/... page.
const tabs: NavItem[] = [
  { href: "/student", label: "Overview", icon: IconHome, exact: true },
  { href: "/student/sessions", label: "My Sessions", icon: IconUsers },
  { href: "/student/hours", label: "Volunteer Hours", icon: IconCheck },
  { href: "/student/skills", label: "My Skills", icon: IconBook },
  { href: "/student/profile", label: "Profile", icon: IconUser },
];

export function StudentSidebar() {
  return <AppSidebar items={tabs} label="Student volunteer" />;
}

export function StudentTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Student volunteer"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden print:hidden"
    >
      {tabs.map((tab) => {
        const current = isActive(pathname, tab.href, tab.exact);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              current
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
