"use client";

import { DashboardComparisonDropdown } from "@/components/marketing/dashboard-comparison-dropdown";
import { DashboardDateRangeDropdown } from "@/components/marketing/dashboard-date-range-dropdown";
import { ClientRow } from "@/components/marketing/client-row";
import { DashboardDateRangeProvider } from "@/contexts/dashboard-date-range-context";
import type { DashboardClientType } from "@/lib/queries/lead-gen-query-keys";

type ClientInternalMarketingViewProps = {
  clientId: string;
  clientName: string;
  leadQualityScore: number | null;
  clientType: DashboardClientType;
};

export function ClientInternalMarketingView({
  clientId,
  clientName,
  leadQualityScore,
  clientType,
}: ClientInternalMarketingViewProps) {
  return (
    <DashboardDateRangeProvider>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <DashboardDateRangeDropdown />
          <DashboardComparisonDropdown />
        </div>
        <ClientRow
          client={{
            id: clientId,
            name: clientName,
            leadQualityScore,
          }}
          clientType={clientType}
          embedded
          defaultOpen
        />
      </div>
    </DashboardDateRangeProvider>
  );
}
