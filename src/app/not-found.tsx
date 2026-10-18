import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <p className="font-heading text-6xl font-bold text-primary-strong">404</p>
      <h1 className="text-3xl font-bold tracking-tight">
        We couldn&apos;t find that page
      </h1>
      <p className="text-lg text-muted-foreground">
        The link may be old, or the page may have moved.
      </p>
      <Button asChild size="xl">
        <Link href="/dashboard">Go to my home page</Link>
      </Button>
    </main>
  );
}
