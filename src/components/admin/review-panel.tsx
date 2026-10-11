import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function ReviewPanel({
  noun,
  approved,
  published,
  notes = [],
  busy,
  onApprove,
  onWithdraw,
}: {
  noun: string;
  approved: boolean;
  published: boolean;
  notes?: string[];
  busy: boolean;
  onApprove: () => void;
  onWithdraw: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4",
        approved
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-muted/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">AI-generated</Badge>
        <Badge variant={approved ? "default" : "outline"}>
          {approved ? "Approved" : "Needs review"}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        {approved
          ? published
            ? `This ${noun} has been reviewed and is live for learners.`
            : `This ${noun} has been reviewed. It stays hidden from learners until you publish it.`
          : `Read everything below and make any edits. Check that it's accurate, easy to follow, and gives no personal financial advice. Approving saves your changes. The ${noun} stays hidden until you publish it.`}
      </p>

      {notes.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Things to double-check
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        {approved ? (
          !published && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onWithdraw}
            >
              Withdraw approval
            </Button>
          )
        ) : (
          <Button type="button" size="sm" disabled={busy} onClick={onApprove}>
            Save & approve
          </Button>
        )}
      </div>
    </div>
  );
}
