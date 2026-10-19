"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconMenu, IconShieldCheck, IconUser, IconX } from "~/components/icons";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
  const [email, setEmail] = useState<string | null>(null);
  // Until we know whether someone is signed in, show neither "Get Started"
  // nor an avatar, so signed-in users never see a flash of "signed out".
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadAdmin(signedIn: boolean) {
      if (!signedIn) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.rpc("is_admin");
      setIsAdmin(data === true);
    }

    // The session in browser storage is enough to choose what to display and
    // avoids a network round trip; pages still verify access on the server.
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
      setAuthReady(true);
      void loadAdmin(!!data.session?.user);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user?.email ?? null);
        setAuthReady(true);
        setTimeout(() => void loadAdmin(!!session?.user), 0);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    // Hard navigation so no signed-in state survives in the client router cache
    window.location.assign("/");
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur">
      <div
        className={cn(
          "mx-auto flex h-16 items-center justify-between px-6",
          variant === "marketing" && "max-w-6xl",
        )}
      >
        <Link
          // /dashboard sends signed-out visitors to the landing page, so it's
          // safe to use until we know whether someone is signed in.
          href={authReady && !email ? "/" : "/dashboard"}
          className="flex items-center gap-2"
        >
          <Logo className="size-10" />
          <span className="font-heading text-xl font-semibold tracking-tight">
            GoldenGuide
          </span>
        </Link>

        {variant === "marketing" && (
          <div className="hidden items-center gap-6 lg:gap-8 md:flex">
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

        <div className="hidden items-center gap-3 md:flex">
          {!authReady ? (
            <span
              aria-hidden="true"
              className="size-9 animate-pulse rounded-full bg-muted"
            />
          ) : email ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                >
                  {email.charAt(0).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                  {email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account" className="flex items-center gap-2">
                    <IconUser className="size-4" />
                    Account Info
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2">
                      <IconShieldCheck className="size-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => void handleSignOut()}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Get Started</Link>
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex size-9 items-center justify-center rounded-md text-foreground md:hidden"
        >
          {open ? (
            <IconX className="size-5" />
          ) : (
            <IconMenu className="size-5" />
          )}
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-1 border-t border-border px-6 py-4 md:hidden">
          {variant === "marketing" &&
            links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
            {!authReady ? null : email ? (
              <>
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {email.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{email}</span>
                </div>
                <Button asChild variant="ghost" className="justify-center">
                  <Link href="/account" onClick={() => setOpen(false)}>
                    Account Info
                  </Link>
                </Button>
                {isAdmin && (
                  <Button asChild variant="ghost" className="justify-center">
                    <Link href="/admin" onClick={() => setOpen(false)}>
                      Admin
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="justify-center"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Button asChild className="justify-center">
                <Link href="/login" onClick={() => setOpen(false)}>
                  Get Started
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
