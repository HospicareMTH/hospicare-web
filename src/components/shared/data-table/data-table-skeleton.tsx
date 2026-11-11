import { LoadingStatus } from "@/components/shared/loading-status";
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROW_COUNT = 6;

export function DataTableSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-10 w-full sm:w-64" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div
        className="flex flex-col gap-3 rounded-xl border p-4"
        aria-hidden="true"
      >
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
      <LoadingStatus label={label} />
    </div>
  );
}
