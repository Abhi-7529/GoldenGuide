import { TERMS, type TermId } from "~/lib/budget";
import { cn } from "~/lib/utils";

/**
 * "What does … mean?" that opens in place with a short meaning and an
 * example. Uses <details>, so it works with the keyboard and screen readers
 * without any script.
 */
export function Term({ id, className }: { id: TermId; className?: string }) {
  const t = TERMS[id];
  return (
    <details
      className={cn(
        "group rounded-lg border-2 border-transparent open:border-border open:bg-muted/40",
        className,
      )}
    >
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-md px-2 text-lg font-medium underline decoration-primary decoration-2 underline-offset-4 outline-none hover:decoration-4 focus-visible:ring-4 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-current text-base font-bold no-underline"
        >
          ?
        </span>
        What does “{t.term}” mean?
      </summary>
      <div className="flex flex-col gap-2 px-3 pt-1 pb-3 text-lg">
        <p>{t.meaning}</p>
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Example: </span>
          {t.example}
        </p>
      </div>
    </details>
  );
}
