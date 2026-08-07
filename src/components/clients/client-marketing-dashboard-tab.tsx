"use client";

import { ClientMarketingDashboardSection } from "@/components/clients/client-marketing-dashboard-section";
import type { ClientPlatformConnection } from "@/lib/queries/clients";
import type { Client } from "@/lib/types";

type ClientMarketingDashboardTabProps = {
  client: Client;
  platformConnections: ClientPlatformConnection[];
};

export function ClientMarketingDashboardTab({
  client,
  platformConnections,
}: ClientMarketingDashboardTabProps) {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure whether this client appears on the internal marketing
        dashboard, their report URL slug, and ad platform account IDs.
      </p>
      <ClientMarketingDashboardSection
        client={client}
        connections={platformConnections}
      />
    </div>
  );
}
