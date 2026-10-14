import { IconShieldAlert } from "~/components/icons";
import { channelLabel } from "~/lib/simulations";
import type { ScamSimulation } from "~/lib/types";
import { cn } from "~/lib/utils";

type FrameSimulation = Pick<
  ScamSimulation,
  "channel" | "sender" | "subject" | "body" | "display_url"
>;

/** The yellow label on every pretend scam, so it's never mistaken for real. */
export function PracticeBanner({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-100 px-3 py-2 text-lg font-bold text-amber-950 dark:bg-amber-950 dark:text-amber-100",
        className,
      )}
    >
      <IconShieldAlert className="size-6 shrink-0" />
      PRACTICE — NOT REAL
    </p>
  );
}

/**
 * Shows a pretend scam the way it would look in real life: a text bubble, an
 * email, a phone call, or a web page. Links are plain text, never clickable,
 * and nothing can be typed in.
 */
export function SimulationFrame({
  simulation,
}: {
  simulation: FrameSimulation;
}) {
  const { channel, sender, subject, body, display_url } = simulation;

  return (
    <figure
      aria-label={`Pretend ${channelLabel(channel).toLowerCase()} for practice`}
      className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-amber-500 bg-muted/40 p-4"
    >
      <PracticeBanner />

      {channel === "text" && (
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-3xl border-4 border-foreground/80 bg-background p-4">
          <p className="text-center text-lg font-semibold">
            {sender || "Unknown number"}
          </p>
          <p className="w-fit max-w-[90%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-xl leading-relaxed">
            {body}
          </p>
        </div>
      )}

      {channel === "email" && (
        <div className="flex flex-col overflow-hidden rounded-xl border-2 border-border bg-background">
          <dl className="flex flex-col gap-1 border-b-2 border-border bg-muted/60 px-4 py-3 text-lg">
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-semibold">From:</dt>
              <dd className="break-all">{sender}</dd>
            </div>
            {subject && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold">Subject:</dt>
                <dd>{subject}</dd>
              </div>
            )}
          </dl>
          <p className="whitespace-pre-line break-words px-4 py-4 text-xl leading-relaxed">
            {body}
          </p>
        </div>
      )}

      {channel === "phone" && (
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-3xl border-4 border-foreground/80 bg-background p-5">
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-base text-muted-foreground">Incoming call</p>
            <p className="text-2xl font-bold">{sender || "Unknown caller"}</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-muted-foreground">
              The caller says:
            </p>
            {body
              .split("\n")
              .filter((line) => line.trim())
              .map((line, i) => (
                <p
                  // biome-ignore lint/suspicious/noArrayIndexKey: lines are static text
                  key={i}
                  className="rounded-2xl bg-muted px-4 py-3 text-xl leading-relaxed"
                >
                  “{line}”
                </p>
              ))}
          </div>
        </div>
      )}

      {channel === "website" && (
        <div className="flex flex-col overflow-hidden rounded-xl border-2 border-border bg-background">
          <div className="flex items-center gap-2 border-b-2 border-border bg-muted/60 px-3 py-2">
            <span className="flex gap-1" aria-hidden>
              <span className="size-3 rounded-full bg-foreground/30" />
              <span className="size-3 rounded-full bg-foreground/30" />
              <span className="size-3 rounded-full bg-foreground/30" />
            </span>
            <p className="min-w-0 flex-1 truncate rounded-md bg-background px-3 py-1 text-base">
              <span className="sr-only">Web address: </span>
              {display_url || "website.example"}
            </p>
          </div>
          <div className="flex flex-col gap-3 px-4 py-4">
            {sender && <p className="text-2xl font-bold">{sender}</p>}
            <p className="whitespace-pre-line break-words text-xl leading-relaxed">
              {body}
            </p>
          </div>
        </div>
      )}

      {display_url && channel !== "website" && (
        <p className="text-base text-muted-foreground">
          The link in this message goes to{" "}
          <span className="break-all font-semibold text-foreground">
            {display_url}
          </span>
          . In this practice, links never open.
        </p>
      )}
    </figure>
  );
}
