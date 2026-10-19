import type * as React from "react";

/** Shared frame for My Profile and Settings. */
export function AccountShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-lg text-muted-foreground">{intro}</p>
      </div>
      {children}
    </main>
  );
}

/** A titled card section. */
export function Section({
  title,
  description,
  children,
  tone,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <section
      className={
        tone === "danger"
          ? "flex flex-col gap-4 rounded-2xl border-2 border-destructive/40 bg-card p-6 shadow-card"
          : "flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-card"
      }
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="text-base text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Success or error line under a form. */
export function FormMessage({
  message,
}: {
  message: { kind: "success" | "error"; text: string } | null;
}) {
  if (!message) return null;
  return (
    <p
      role={message.kind === "error" ? "alert" : "status"}
      className={
        message.kind === "error"
          ? "text-base text-destructive"
          : "text-base font-medium text-primary-strong"
      }
    >
      {message.text}
    </p>
  );
}

/** Tells the header to reload the name and preferences it shows. */
export function announceAccountUpdated() {
  window.dispatchEvent(new Event("goldenguide:account-updated"));
}
