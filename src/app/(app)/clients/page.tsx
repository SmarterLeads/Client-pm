import Link from "next/link";
import { Suspense } from "react";
import { ClientsFilters } from "@/components/clients/clients-filters";
import { ClientsList } from "@/components/clients/clients-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAgenciesList } from "@/lib/queries/agencies";
import { getClientsList } from "@/lib/queries/clients";
import { clientListFiltersSchema } from "@/lib/validations/client";

type ClientsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    rag?: string;
    agency?: string;
    agency_id?: string;
    include_inactive?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const parsed = clientListFiltersSchema.safeParse({
    q: params.q,
    status: params.status || undefined,
    rag: params.rag || undefined,
    agency: params.agency || undefined,
    agency_id: params.agency_id || undefined,
    include_inactive: params.include_inactive || undefined,
  });

  const filters = parsed.success ? parsed.data : { includeInactive: false };
  const [clientsPage, agencies] = await Promise.all([
    getClientsList(filters),
    getAgenciesList(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {filters.includeInactive
              ? `${clientsPage.totalCount} client${clientsPage.totalCount === 1 ? "" : "s"}`
              : `${clientsPage.totalCount} active client${clientsPage.totalCount === 1 ? "" : "s"}`}
            {clientsPage.nextCursor ? "+" : ""}
          </p>
        </div>
        <Button render={<Link href="/clients/new" />}>New client</Button>
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <ClientsFilters agencies={agencies} />
      </Suspense>

      <ClientsList
        key={JSON.stringify(filters)}
        initialClients={clientsPage.clients}
        initialNextCursor={clientsPage.nextCursor}
        filters={filters}
      />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Skeleton className="h-8 w-full sm:max-w-xs" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-44" />
    </div>
  );
}
