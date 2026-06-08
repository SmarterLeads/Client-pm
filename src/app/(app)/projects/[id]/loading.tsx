import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex w-72 shrink-0 flex-col">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-6" />
            </div>
            <div className="flex min-h-[280px] flex-col gap-2 rounded-lg border border-dashed border-border p-2">
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <Skeleton key={cardIndex} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
