"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { cn } from "~/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Only highlight on this exact page, not the pages below it. */
  exact?: boolean;
};

export function isActive(pathname: string, href: string, exact = false) {
  return pathname === href || (!exact && pathname.startsWith(`${href}/`));
}

/** Desktop side navigation. Pages show their own compact nav on small screens. */
export function AppSidebar({
  items,
  label,
  children,
}: {
  items: NavItem[];
  label: string;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 hidden print:hidden! h-[calc(100vh-4rem)] w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-sidebar p-4 md:flex lg:w-72 lg:p-5">
      <nav aria-label={label} className="flex flex-col gap-1.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors lg:px-4 lg:text-lg",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-6 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children && (
        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-5">
          {children}
        </div>
      )}
    </aside>
  );
}
