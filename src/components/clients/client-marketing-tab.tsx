import { Suspense } from "react";

import { ClientInternalMarketingView } from "@/components/clients/client-internal-marketing-view";
import { ClientMarketingReportView } from "@/components/marketing/report/client-marketing-report-view";
import type { ClientMarketingReportSearchParams } from "@/components/marketing/report/client-marketing-report-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientMarketingProfile } from "@/lib/queries/marketing";
import type { Client } from "@/lib/types";

export type ClientMarketingSearchParams = ClientMarketingReportSearchParams & {
  marketingSub?: string;
};

type ClientMarketingTabProps = {
  client: Client;
  searchParams: ClientMarketingSearchParams;
};

export async function ClientMarketingTab({
  client,
  searchParams,
}: ClientMarketingTabProps) {
  const profile = await getClientMarketingProfile(client.id);

  if (!profile?.reportSlug) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
        <p className="text-sm font-medium">
          No marketing data configured for this client
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Set a <code className="rounded bg-muted px-1 py-0.5">report_slug</code>{" "}
          on the client record to connect marketing performance data and enable
          internal and client-facing dashboards.
        </p>
      </div>
    );
  }

  const marketingSub =
    searchParams.marketingSub === "client" ? "client" : "internal";

  if (marketingSub === "client") {
    return (
      <Suspense fallback={<ClientReportSkeleton />}>
        <ClientMarketingReportView
          slug={profile.reportSlug}
          searchParams={searchParams}
          embedded
          navBasePath={`/clients/${client.id}`}
          navPreservedQuery={{ tab: "marketing", marketingSub: "client" }}
        />
      </Suspense>
    );
  }

  return (
    <ClientInternalMarketingView
      clientId={client.id}
      clientName={client.name}
      leadQualityScore={profile.leadQualityScore}
      clientType={profile.clientType}
    />
  );
}

function ClientReportSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <Skeleton className="mx-auto h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
