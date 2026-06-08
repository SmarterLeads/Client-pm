import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-8 w-full sm:max-w-xs" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="hidden h-4 w-24 lg:block" />
              <Skeleton className="hidden h-4 w-32 md:block" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-3 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
