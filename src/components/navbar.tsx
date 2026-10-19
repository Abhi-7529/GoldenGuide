"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type Account, AccountMenu } from "~/components/account-menu";
import { IconMenu, IconX } from "~/components/icons";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import {
  applyPreferences,
  normalizePreferences,
  resetPreferences,
} from "~/lib/preferences";
import { createClient } from "~/lib/supabase/client";
import { cn } from "~/lib/utils";

const links = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#features", label: "Features" },
  { href: "#for-caregivers", label: "For Caregivers" },
  { href: "#pricing", label: "Pricing" },
  { href: "/organizations", label: "Organizations" },
];

export function Navbar({
  variant = "marketing",
}: {
  variant?: "marketing" | "app";
}) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  // Until we know whether someone is signed in, show neither "Get Started"
  // nor an avatar, so signed-in users never see a flash of "signed out".
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadAccount(user: { id: string; email?: string } | null) {
      if (!user) {
        setAccount(null);
        return;
      }
      const [{ data: profile }, { data: isAdmin }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, role, text_size, high_contrast, read_aloud_rate")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.rpc("is_admin"),
      ]);
      setAccount({
        email: user.email ?? "",
        fullName: profile?.full_name || null,
        role: profile?.role ?? null,
        isAdmin: isAdmin === true,
      });
      // The saved preferences follow the person to any device.
      if (profile) applyPreferences(normalizePreferences(profile));
    }

    // The session in browser storage is enough to choose what to display and
    // avoids a network round trip; pages still verify access on the server.
    supabase.auth.getSession().then(({ data }) => {
      setAuthReady(true);
      void loadAccount(data.session?.user ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthReady(true);
        if (event === "SIGNED_OUT") resetPreferences();
        // Supabase calls should run after this callback returns.
        setTimeout(() => void loadAccount(session?.user ?? null), 0);
      },
    );

    // Profile and Settings pages announce changes so the menu stays current.
    function refresh() {
      supabase.auth
        .getSession()
        .then(({ data }) => loadAccount(data.session?.user ?? null));
    }
    window.addEventListener("goldenguide:account-updated", refresh);

    return () => {
      subscription.subscription.unsubscribe();
      window.removeEventListener("goldenguide:account-updated", refresh);
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    resetPreferences();
    setOpen(false);
    // Hard navigation so no signed-in state survives in the client router cache
    window.location.assign("/");
  }

  const showLinks = variant === "marketing";

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur">
      <div
        className={cn(
          "mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6",
          variant === "marketing" && "max-w-6xl",
        )}
      >
        <Link
          // /dashboard sends signed-out visitors to the landing page, so it's
          // safe to use until we know whether someone is signed in.
          href={authReady && !account ? "/" : "/dashboard"}
          className="flex items-center gap-2"
        >
          <Logo className="size-10" />
          <span className="font-heading text-xl font-semibold tracking-tight">
            GoldenGuide
          </span>
        </Link>

        {showLinks && (
          <div className="hidden items-center gap-6 md:flex lg:gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {!authReady ? (
            <span
              aria-hidden="true"
              className="size-10 animate-pulse rounded-full bg-muted"
            />
          ) : account ? (
            <AccountMenu account={account} onSignOut={handleSignOut} />
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Get Started</Link>
            </Button>
          )}

          {showLinks && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="flex size-10 items-center justify-center rounded-full text-foreground hover:bg-accent md:hidden"
            >
              {open ? (
                <IconX className="size-5" />
              ) : (
                <IconMenu className="size-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {open && showLinks && (
        <div className="flex flex-col gap-1 border-t border-border px-6 py-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2.5 text-base text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
