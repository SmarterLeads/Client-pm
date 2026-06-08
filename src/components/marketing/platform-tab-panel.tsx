"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useDashboardDateRange } from "@/contexts/dashboard-date-range-context";
import {
  fetchConversionBreakdown,
  fetchDailyKpisForView,
  fetchInternalCampaignPerformance,
  type PlatformBudgetPacingRow,
  type PlatformTab,
} from "@/lib/queries/lead-gen-queries";
import { comparisonPeriodLabel } from "@/lib/lead-gen/date-windows";
import {
  type DashboardClientType,
  leadGenKeys,
} from "@/lib/queries/lead-gen-query-keys";
import {
  buildInternalDashboardCampaignColumns,
  type InternalDashboardCampaignPlatform,
} from "@/lib/report/channel-metric-config";
import { createClient } from "@/lib/supabase/client";

import { ConversionBreakdownTable } from "@/components/marketing/conversion-breakdown-table";
import { GhlTabPanel } from "@/components/marketing/ghl-tab-panel";
import { InternalCampaignPerformanceTable } from "@/components/marketing/internal-campaign-performance-table";
import { KpiCards } from "@/components/marketing/kpi-cards";
import { BudgetPacingBudgetEditor } from "@/components/marketing/budget-pacing-budget-editor";
import {
  ConversionTableSkeleton,
  KpiCardsSkeleton,
  SkeletonLine,
} from "@/components/marketing/skeletons";

function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

type AdsPacingColor = { text: string; bar: string };

function pacingPct(spent: number, budget: number, daysElapsed: number, totalDaysInMonth: number) {
  const targetSpend =
    budget > 0 && totalDaysInMonth > 0 ? (budget * daysElapsed) / totalDaysInMonth : 0;
  if (targetSpend <= 0) return 0;
  return (spent / targetSpend) * 100;
}

function pacingColor(pct: number, budget: number): AdsPacingColor {
  if (budget <= 0 || !Number.isFinite(pct) || pct <= 0) {
    return { text: "text-amber-700 dark:text-amber-300", bar: "bg-amber-500" };
  }
  if (pct < 70 || pct > 130) {
    return { text: "text-red-700 dark:text-red-300", bar: "bg-red-500" };
  }
  if (pct < 85 || pct > 115) {
    return { text: "text-amber-700 dark:text-amber-300", bar: "bg-amber-500" };
  }
  return { text: "text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" };
}

function PacingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

function CompactPlatformBudgetPacing({
  state,
  clientId,
  totalsPlatformKey,
}: {
  state:
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ok"; row: PlatformBudgetPacingRow };
  clientId?: string;
  totalsPlatformKey?: string;
}) {
  if (state.status === "loading") {
    return (
      <div className="mt-4 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/90 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="h-2 w-full" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SkeletonLine className="h-8 w-full" />
          <SkeletonLine className="h-8 w-full" />
          <SkeletonLine className="h-8 w-full" />
          <SkeletonLine className="h-8 w-full" />
        </div>
      </div>
    );
  }
  if (state.status === "error") {
    return <p className="text-xs text-red-600">{state.message}</p>;
  }
  const r = state.row;
  const budget = r.budgetCents;
  const spent = r.spentToDateCents;
  const projected = r.projectedMonthEndCents;
  const pct = pacingPct(spent, budget, r.daysElapsed, r.totalDaysInMonth);
  const color = pacingColor(pct, budget);
  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/90 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h5 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Budget pacing
        </h5>
        <span className={`shrink-0 text-[10px] font-semibold ${color.text}`}>
          {budget > 0 ? `${pct.toFixed(0)}% pacing` : "No budget set"}
        </span>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {clientId && totalsPlatformKey ? (
          <BudgetPacingBudgetEditor
            clientId={clientId}
            platform={r.platform}
            budgetCents={budget}
            totalsPlatformKey={totalsPlatformKey}
          />
        ) : (
          <PacingStat label="Budget" value={formatUsdFromCents(budget)} />
        )}
        <PacingStat label="Spent (MTD)" value={formatUsdFromCents(spent)} />
        <PacingStat label="Projected month-end" value={formatUsdFromCents(projected)} />
        <PacingStat label="Days remaining" value={`${r.daysRemaining}`} />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
          <span>Pacing vs target</span>
          <span className="tabular-nums">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full ${color.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

type Props = {
  clientId: string;
  platform: PlatformTab;
  clientType: DashboardClientType;
  /** Same key as `leadGenKeys.platformBudgetPacing(clientId, …)` for cache invalidation */
  totalsPlatformKey: string;
  /** Google / Meta / Microsoft: optional budget pacing below conversion table */
  adsBudgetPacing?:
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; row: PlatformBudgetPacingRow };
};

export function PlatformTabPanel({
  clientId,
  platform,
  clientType,
  totalsPlatformKey,
  adsBudgetPacing,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { preset, customStart, customEnd, comparison, rangeQueryKey } =
    useDashboardDateRange();
  const rangeOptions = useMemo(
    () => ({ preset, customStart, customEnd, comparison }),
    [preset, customStart, customEnd, comparison],
  );
  const comparisonLabel = useMemo(() => comparisonPeriodLabel(comparison), [comparison]);

  const kpiQuery = useQuery({
    queryKey: leadGenKeys.dailyKpis(clientId, platform, clientType, rangeQueryKey),
    queryFn: () =>
      fetchDailyKpisForView(supabase, clientId, platform, clientType, rangeOptions),
    enabled: platform !== "ghl",
  });

  const convQuery = useQuery({
    queryKey: leadGenKeys.conversionBreakdown(clientId, platform, rangeQueryKey),
    queryFn: () => fetchConversionBreakdown(supabase, clientId, platform, rangeOptions),
    enabled: platform !== "ghl",
  });

  const isAdsPlatform =
    platform === "google" || platform === "meta" || platform === "microsoft";

  const campaignQuery = useQuery({
    queryKey: leadGenKeys.campaignPerformance(clientId, platform, rangeQueryKey),
    queryFn: () => fetchInternalCampaignPerformance(supabase, clientId, platform, rangeOptions),
    enabled: isAdsPlatform,
  });

  const campaignColumns = useMemo(() => {
    if (!isAdsPlatform) return [];
    return buildInternalDashboardCampaignColumns(
      platform as InternalDashboardCampaignPlatform,
    );
  }, [isAdsPlatform, platform]);

  if (platform === "ghl") {
    return <GhlTabPanel clientId={clientId} />;
  }

  return (
    <div className="space-y-5">
      {kpiQuery.isLoading ? (
        <KpiCardsSkeleton />
      ) : kpiQuery.isError ? (
        <div className="space-y-1 text-sm text-red-600">
          <p>Could not load KPIs.</p>
          <p className="text-xs font-normal text-red-600/90">
            {(kpiQuery.error as Error)?.message ??
              (typeof kpiQuery.error === "object" &&
              kpiQuery.error &&
              "message" in kpiQuery.error &&
              typeof (kpiQuery.error as { message: unknown }).message === "string"
                ? (kpiQuery.error as { message: string }).message
                : String(kpiQuery.error ?? "Unknown error"))}
          </p>
        </div>
      ) : (
        <KpiCards items={kpiQuery.data ?? []} comparisonLabel={comparisonLabel} />
      )}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Conversion breakdown
        </h4>
        {convQuery.isLoading ? (
          <ConversionTableSkeleton />
        ) : convQuery.isError ? (
          <div className="space-y-1 text-sm text-red-600">
            <p>Could not load conversions.</p>
            <p className="text-xs font-normal text-red-600/90">
              {(convQuery.error as Error)?.message ??
                (typeof convQuery.error === "object" &&
                convQuery.error &&
                "message" in convQuery.error &&
                typeof (convQuery.error as { message: unknown }).message === "string"
                  ? (convQuery.error as { message: string }).message
                  : String(convQuery.error ?? "Unknown error"))}
            </p>
          </div>
        ) : (
          <ConversionBreakdownTable groups={convQuery.data ?? []} />
        )}
      </div>
      {adsBudgetPacing ? (
        adsBudgetPacing.kind === "loading" ? (
          <CompactPlatformBudgetPacing state={{ status: "loading" }} />
        ) : adsBudgetPacing.kind === "error" ? (
          <CompactPlatformBudgetPacing
            state={{ status: "error", message: adsBudgetPacing.message }}
          />
        ) : (
          <CompactPlatformBudgetPacing
            state={{ status: "ok", row: adsBudgetPacing.row }}
            clientId={clientId}
            totalsPlatformKey={totalsPlatformKey}
          />
        )
      ) : null}
      {isAdsPlatform ? (
        <div>
          <h5 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Campaign performance
          </h5>
          {campaignQuery.isLoading ? (
            <SkeletonLine className="h-24 w-full rounded-lg" />
          ) : campaignQuery.isError ? (
            <p className="text-xs text-red-600">{(campaignQuery.error as Error).message}</p>
          ) : (
            <InternalCampaignPerformanceTable
              rows={campaignQuery.data ?? []}
              columns={campaignColumns}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
