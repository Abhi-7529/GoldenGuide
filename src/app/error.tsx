"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "~/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only the digest is logged; it points to the server log without
    // exposing details to the visitor.
    console.error("Page error", error.digest ?? "");
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-lg text-muted-foreground">
        Sorry, this page didn&apos;t load properly. This is usually brief.
        Please try again, or check your internet connection.
      </p>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button size="xl" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild size="xl" variant="outline">
          <Link href="/dashboard">Go to my home page</Link>
        </Button>
      </div>
    </main>
  );
}
