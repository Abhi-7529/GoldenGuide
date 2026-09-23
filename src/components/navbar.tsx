"use client";

import Link from "next/link";
import { useState } from "react";
import { IconMenu, IconX } from "~/components/icons";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";

const links = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#features", label: "Features" },
  { href: "#for-caregivers", label: "For Caregivers" },
  { href: "#about", label: "About" },
  { href: "#safety", label: "Safety" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-10" />
          <span className="text-lg font-semibold tracking-tight">
            GoldenGuide
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
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

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
          <Button asChild size="sm">
            <Link href="#get-started">Get Started</Link>
          </Button>
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
          {links.map((link) => (
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
            <Button variant="ghost" className="justify-center">
              Sign In
            </Button>
            <Button asChild className="justify-center">
              <Link href="#get-started" onClick={() => setOpen(false)}>
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
