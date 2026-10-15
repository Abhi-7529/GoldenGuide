"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBook,
  IconCalculator,
  IconHome,
  IconMessageCircle,
  IconShieldAlert,
  IconShieldCheck,
  IconTarget,
  IconTrendingUp,
} from "~/components/icons";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const tabs = [
  { href: "/home", label: "Home", icon: IconHome },
  { href: "/learn", label: "Lessons", icon: IconBook },
  { href: "/practice", label: "Practice", icon: IconTarget },
  { href: "/scam-practice", label: "Scam Practice", icon: IconShieldCheck },
  { href: "/budget", label: "Budget", icon: IconCalculator },
  { href: "/progress", label: "My Progress", icon: IconTrendingUp },
];

export function RecipientTabs({
  connectionId,
}: {
  connectionId: string | null;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-lg font-semibold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent",
              )}
            >
              <Icon className="size-6 shrink-0" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          asChild
          size="xl"
          variant={pathname === "/scam-help" ? "destructive" : "outline"}
          className={cn(
            "w-full border-2 sm:w-fit",
            pathname !== "/scam-help" &&
              "border-destructive/60 text-destructive hover:bg-destructive/5 hover:text-destructive",
          )}
        >
          <Link href="/scam-help">
            <IconShieldAlert />
            Is this a scam? Get help
          </Link>
        </Button>

        {connectionId ? (
          <Button
            asChild
            size="xl"
            variant="outline"
            className="w-full sm:w-fit"
          >
            <Link href={`/messages/${connectionId}`}>
              <IconMessageCircle />
              Ask my caregiver for help
            </Link>
          </Button>
        ) : (
          <p className="flex items-center gap-2 text-base text-muted-foreground">
            <IconMessageCircle className="size-5 shrink-0" />
            To ask a caregiver for help, connect with them on the Home page.
          </p>
        )}
      </div>
    </nav>
  );
}
