import { Skeleton } from "@/components/ui/Skeleton";
import { RetailerChecklist } from "./RetailerChecklist";

export function ResultsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading prices">
      <div className="rounded-2xl border border-line bg-paper p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <Skeleton className="h-32 w-32 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
            <RetailerChecklist resolved={[]} pending />
          </div>
        </div>
      </div>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-2 border-t border-line px-4 py-4 first:border-t-0"
          >
            <Skeleton className="col-span-1 h-5" />
            <Skeleton className="col-span-3 h-5" />
            <Skeleton className="col-span-2 h-5" />
            <Skeleton className="col-span-2 h-5" />
            <Skeleton className="col-span-2 h-5" />
            <Skeleton className="col-span-2 h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}
