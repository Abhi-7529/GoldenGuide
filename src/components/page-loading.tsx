import { Skeleton } from "~/components/ui/skeleton";

/** Shown while a page's data loads, so nobody stares at a frozen screen. */
export function PageLoading() {
  return (
    <div role="status" className="flex flex-col gap-5">
      <p className="text-lg text-muted-foreground">Loading…</p>
      <Skeleton className="h-10 w-2/3 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
