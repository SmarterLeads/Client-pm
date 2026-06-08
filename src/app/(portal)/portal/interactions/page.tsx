import { Suspense } from "react";
import { PortalInteractionTimeline } from "@/components/portal/portal-interaction-timeline";
import { PortalInteractionFilters } from "@/components/portal/portal-interaction-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { getPortalInteractions } from "@/lib/queries/portal";
import { clientInteractionFiltersSchema } from "@/lib/validations/interaction";

type PortalInteractionsPageProps = {
  searchParams: Promise<{
    type?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function PortalInteractionsPage({
  searchParams,
}: PortalInteractionsPageProps) {
  const params = await searchParams;
  const parsed = clientInteractionFiltersSchema.safeParse({
    type: params.type,
    from: params.from,
    to: params.to,
  });

  const filters = parsed.success ? parsed.data : {};
  const interactions = await getPortalInteractions(filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Interactions</h1>
        <p className="text-sm text-muted-foreground">
          {interactions.length} interaction
          {interactions.length === 1 ? "" : "s"} with your team
        </p>
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <PortalInteractionFilters />
      </Suspense>

      {interactions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          No interactions match your filters.
        </p>
      ) : (
        <PortalInteractionTimeline interactions={interactions} />
      )}
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-40" />
    </div>
  );
}
