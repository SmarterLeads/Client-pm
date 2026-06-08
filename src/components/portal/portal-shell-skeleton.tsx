import { Skeleton } from "@/components/ui/skeleton";

export function PortalShellSkeleton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-border px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-lg" />
          ))}
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-lg" />
        {children}
      </main>
    </div>
  );
}
