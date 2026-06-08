import { Suspense } from "react";
import { MarketingCampaignTable } from "@/components/marketing/marketing-campaign-table";
import { MarketingDateRangeFilter } from "@/components/marketing/marketing-date-range-filter";
import { MarketingKpiCards } from "@/components/marketing/marketing-kpi-cards";
import { MarketingPlatformTable } from "@/components/marketing/marketing-platform-table";
import { MarketingSpendChart } from "@/components/marketing/marketing-spend-chart";
import { AgencyBadge } from "@/components/team/agency-badge";
import { RagDot } from "@/components/clients/rag-dot";
import type { MarketingClientData } from "@/lib/marketing/types";
import type { RagStatus } from "@/lib/types";

type MarketingClientDetailProps = {
  data: MarketingClientData;
  showHeader?: boolean;
};

export function MarketingClientDetail({
  data,
  showHeader = true,
}: MarketingClientDetailProps) {
  return (
    <div className="space-y-6">
      {showHeader ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {data.client.name}
              </h1>
              <AgencyBadge name={data.client.agencyName} />
            </div>
          </div>
          <RagDot status={data.client.ragStatus as RagStatus} />
        </div>
      ) : null}

      <Suspense fallback={null}>
        <MarketingDateRangeFilter />
      </Suspense>

      <MarketingKpiCards totals={data.totals} includeImpressions />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Spend over time
        </h2>
        <MarketingSpendChart data={data.daily} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Platform breakdown
        </h2>
        <MarketingPlatformTable rows={data.byPlatform} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Campaigns</h2>
        <MarketingCampaignTable campaigns={data.campaigns} />
      </section>
    </div>
  );
}
