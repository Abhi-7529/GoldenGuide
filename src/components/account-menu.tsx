"use client";

import Link from "next/link";
import type * as React from "react";
import {
  IconCreditCard,
  IconDashboard,
  IconHelp,
  IconLogOut,
  IconSettings,
  IconUser,
} from "~/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ROLE_LABELS, type Role } from "~/lib/roles";
import { cn } from "~/lib/utils";

export type Account = {
  email: string;
  fullName: string | null;
  role: Role | null;
  isAdmin: boolean;
};

/** Up to two initials from the name, or the first letter of the email. */
export function initialsOf(account: Pick<Account, "email" | "fullName">) {
  const words = (account.fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    return words
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  return account.email.charAt(0).toUpperCase();
}

export function Avatar({
  account,
  className,
}: {
  account: Pick<Account, "email" | "fullName">;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
        className,
      )}
    >
      {initialsOf(account)}
    </span>
  );
}

type MenuLink = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

function menuLinks(account: Account): MenuLink[] {
  // Until onboarding is finished there's no profile to show or edit yet.
  if (!account.role) {
    return [{ href: "/help", label: "Help & Support", icon: IconHelp }];
  }
  const links: MenuLink[] = [
    { href: "/account", label: "My Profile", icon: IconUser },
  ];
  // Only caregivers buy or manage a membership; learners never see billing.
  if (account.role === "caregiver") {
    links.push({
      href: "/caregiver/membership",
      label: "Membership & Billing",
      icon: IconCreditCard,
    });
  }
  links.push(
    { href: "/settings", label: "Settings", icon: IconSettings },
    { href: "/help", label: "Help & Support", icon: IconHelp },
  );
  // Just a shortcut: the admin pages check access on the server too.
  if (account.isAdmin) {
    links.push({
      href: "/admin",
      label: "Admin Dashboard",
      icon: IconDashboard,
    });
  }
  return links;
}

export function AccountMenu({
  account,
  onSignOut,
}: {
  account: Account;
  onSignOut: () => void;
}) {
  const name = account.fullName?.trim() || account.email;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${name}`}
          className="rounded-full outline-none transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/60"
        >
          <Avatar account={account} className="size-10 text-sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl p-2 shadow-card"
      >
        <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2.5 font-normal">
          <Avatar account={account} className="size-11 text-base" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-base font-semibold">{name}</span>
            {account.fullName && (
              <span className="truncate text-sm text-muted-foreground">
                {account.email}
              </span>
            )}
            {account.role && (
              <span className="mt-0.5 w-fit rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                {ROLE_LABELS[account.role]}
                {account.isAdmin && " · Admin"}
              </span>
            )}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-0" />
        {menuLinks(account).map((link) => {
          const Icon = link.icon;
          return (
            <DropdownMenuItem
              key={link.href}
              asChild
              className="gap-3 rounded-xl px-3 py-2.5 text-base"
            >
              <Link href={link.href}>
                <Icon className="size-5 text-muted-foreground" />
                {link.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="mx-0 my-2" />
        <DropdownMenuItem
          onSelect={onSignOut}
          className="gap-3 rounded-xl px-3 py-2.5 text-base text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <IconLogOut className="size-5" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
