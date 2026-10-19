import Link from "next/link";
import { Logo } from "~/components/logo";

const links = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#for-caregivers", label: "For Caregivers" },
  { href: "/organizations", label: "For Organizations" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo className="size-6" />
          GoldenGuide
        </span>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-6xl text-center text-sm text-muted-foreground sm:text-left">
        © {new Date().getFullYear()} GoldenGuide. Financial education, not
        financial advice. Available in the United States.
      </p>
    </footer>
  );
}
