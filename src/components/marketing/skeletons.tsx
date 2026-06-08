export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <SkeletonLine className="mb-2 h-3 w-20" />
          <SkeletonLine className="h-6 w-24" />
          <SkeletonLine className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function ConversionTableSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <SkeletonLine className="h-4 w-40" />
      <SkeletonLine className="h-8 w-full" />
      <SkeletonLine className="h-8 w-full" />
      <SkeletonLine className="h-8 w-3/4" />
    </div>
  );
}

export function GhlGroupsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <SkeletonLine className="mb-3 h-3 w-28" />
          <SkeletonLine className="mb-2 h-3 w-full" />
          <SkeletonLine className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export function FunnelSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonLine key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

export function ClientRowSkeleton() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-4">
        <SkeletonLine className="h-5 w-40" />
        <SkeletonLine className="h-7 w-28" />
        <SkeletonLine className="h-12 w-24" />
        <SkeletonLine className="h-12 w-24" />
        <SkeletonLine className="h-10 w-20" />
        <SkeletonLine className="h-8 w-32" />
      </div>
    </div>
  );
}
