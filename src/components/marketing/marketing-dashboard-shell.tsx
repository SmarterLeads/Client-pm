"use client";

import { DashboardComparisonDropdown } from "@/components/marketing/dashboard-comparison-dropdown";
import { DashboardDateRangeDropdown } from "@/components/marketing/dashboard-date-range-dropdown";
import {
  LeadGenDashboard,
  type MarketingDashboardAgency,
} from "@/components/marketing/lead-gen-dashboard";
import { DashboardDateRangeProvider } from "@/contexts/dashboard-date-range-context";

type MarketingDashboardShellProps = {
  agencies: MarketingDashboardAgency[];
  includePaused?: boolean;
  includeChurned?: boolean;
};

export function MarketingDashboardShell({
  agencies,
  includePaused = false,
  includeChurned = false,
}: MarketingDashboardShellProps) {
  return (
    <DashboardDateRangeProvider>
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <DashboardDateRangeDropdown />
        <DashboardComparisonDropdown />
      </div>
      <LeadGenDashboard
        agencies={agencies}
        includePaused={includePaused}
        includeChurned={includeChurned}
      />
    </DashboardDateRangeProvider>
  );
}
