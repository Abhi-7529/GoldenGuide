import type * as React from "react";

/** Shared frame for public pages like Contact, Privacy and Organizations. */
export function PublicPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="px-6 py-14 sm:py-20">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {title}
          </h1>
          {intro && (
            <div className="text-lg text-muted-foreground">{intro}</div>
          )}
        </header>
        {children}
      </div>
    </main>
  );
}

/** Long-form text with readable spacing (used by Privacy and Terms). */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 text-lg leading-relaxed [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:ml-6 [&_li]:list-disc [&_a]:font-medium [&_a]:text-primary-strong [&_a]:underline [&_a]:underline-offset-4 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
      {children}
    </div>
  );
}
