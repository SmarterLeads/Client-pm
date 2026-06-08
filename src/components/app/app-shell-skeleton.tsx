import { Skeleton } from "@/components/ui/skeleton";

export function AppShellSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-16 shrink-0 border-r border-border bg-muted/30 lg:block lg:w-56">
        <Skeleton className="m-4 h-6 w-24" />
        <div className="space-y-2 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-4 border-b border-border px-4">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </header>
        <main className="flex-1 p-6">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
          {children}
        </main>
      </div>
    </div>
  );
}
