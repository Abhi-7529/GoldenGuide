import Link from "next/link";
import { Logo } from "~/components/logo";

const columns = [
  {
    title: "GoldenGuide",
    links: [
      { href: "/#how-it-works", label: "How It Works" },
      { href: "/#features", label: "Features" },
      { href: "/#for-caregivers", label: "For Caregivers" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help & Support" },
      { href: "/contact", label: "Contact Us" },
      { href: "/organizations", label: "Organizations" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card px-6 pt-14 pb-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex w-fit items-center gap-2">
              <Logo className="size-9" />
              <span className="font-heading text-xl font-semibold tracking-tight">
                GoldenGuide
              </span>
            </Link>
            <p className="max-w-xs text-base text-muted-foreground">
              Simple money lessons, safe scam practice and caregiver support,
              made for older adults.
            </p>
          </div>
          {columns.map((column) => (
            <nav
              key={column.title}
              aria-label={column.title}
              className="flex flex-col gap-3"
            >
              <p className="text-sm font-semibold">{column.title}</p>
              {column.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="w-fit text-base text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} GoldenGuide. All rights reserved.</p>
          <p>
            Financial education, not financial advice. Available in the United
            States.
          </p>
        </div>
      </div>
    </footer>
  );
}
