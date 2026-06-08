import { Suspense } from "react";
import { InteractionsFilters } from "@/components/interactions/interactions-filters";
import { InteractionsTable } from "@/components/interactions/interactions-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAllInteractions,
  getClientsForInteractionFilter,
} from "@/lib/queries/interactions";
import { interactionListFiltersSchema } from "@/lib/validations/interaction";

type InteractionsPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    client?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function InteractionsPage({
  searchParams,
}: InteractionsPageProps) {
  const params = await searchParams;
  const parsed = interactionListFiltersSchema.safeParse({
    type: params.type,
    client: params.client,
    from: params.from,
    to: params.to,
    q: params.q,
  });

  const filters = parsed.success
    ? {
        type: parsed.data.type,
        client_id: parsed.data.client,
        from: parsed.data.from,
        to: parsed.data.to,
        q: parsed.data.q,
      }
    : {};

  const [interactions, clients] = await Promise.all([
    getAllInteractions(filters),
    getClientsForInteractionFilter(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Interactions</h1>
        <p className="text-sm text-muted-foreground">
          {interactions.length} interaction
          {interactions.length === 1 ? "" : "s"} across all clients
        </p>
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <InteractionsFilters clients={clients} />
      </Suspense>

      <InteractionsTable interactions={interactions} />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Skeleton className="h-8 w-full sm:max-w-xs" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-40" />
    </div>
  );
}
