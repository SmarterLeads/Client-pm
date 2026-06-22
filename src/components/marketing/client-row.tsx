"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useDashboardDateRange } from "@/contexts/dashboard-date-range-context";
import {
  fetchClientHasAlert,
  fetchClientHeroSeries,
  fetchPlatformBudgetPacing,
  fetchClientPlatforms,
  fetchPlatformTotals,
  fetchPrimaryMetricsForView,
  fetchShowUnconfiguredBanner,
  fetchSpendAndBudgetCap,
  type PlatformBudgetPacingRow,
  type PlatformTab,
} from "@/lib/queries/lead-gen-queries";
import {
  type DashboardClientType,
  leadGenKeys,
} from "@/lib/queries/lead-gen-query-keys";
import { createClient } from "@/lib/supabase/client";

import { BudgetPacingBar } from "@/components/marketing/budget-pacing-bar";
import { ClientHeroChart, type HeroChartMode } from "@/components/marketing/client-hero-chart";
import { PlatformIconRow } from "@/components/marketing/platform-icons";
import { PlatformTabPanel } from "@/components/marketing/platform-tab-panel";
import { UnconfiguredConversionsBanner } from "@/components/marketing/unconfigured-banner";
import { SkeletonLine } from "@/components/marketing/skeletons";

function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function platformLabel(p: PlatformTab) {
  const labels: Record<PlatformTab, string> = {
    google: "Google Ads",
    meta: "Meta Ads",
    microsoft: "Microsoft Ads",
    linkedin: "LinkedIn",
    ghl: "GHL",
  };
  return labels[p];
}

function platformAccent(p: PlatformTab): string {
  if (p === "google") return "#4285F4";
  // #0866FF reads as blue next to Google; use a distinct Meta purple rail.
  if (p === "meta") return "#833AB4";
  if (p === "microsoft") return "#00A4EF";
  return "#d4d4d8";
}

export type ClientListItem = {
  id: string;
  name: string;
  leadQualityScore: number | null;
};

type Props = {
  client: ClientListItem;
  clientType: DashboardClientType;
  /** When true, hides settings shortcut (client detail embed). */
  embedded?: boolean;
  /** Start with platform panels expanded. */
  defaultOpen?: boolean;
};

export function ClientRow({
  client,
  clientType,
  embedded = false,
  defaultOpen = false,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { preset, customStart, customEnd, comparison, rangeQueryKey } =
    useDashboardDateRange();
  const rangeOptions = useMemo(
    () => ({ preset, customStart, customEnd, comparison }),
    [preset, customStart, customEnd, comparison],
  );
  const [open, setOpen] = useState(defaultOpen);
  const [heroMode, setHeroMode] = useState<HeroChartMode>("conversions");

  const platformsQuery = useQuery({
    queryKey: leadGenKeys.clientPlatforms(client.id),
    queryFn: () => fetchClientPlatforms(supabase, client.id),
  });

  const platforms = useMemo(
    () => platformsQuery.data ?? [],
    [platformsQuery.data],
  );

  const stackedPlatforms = useMemo(
    () => platforms.filter((p): p is PlatformTab => p !== "ghl"),
    [platforms],
  );
  const totalsPlatforms = useMemo(
    () => stackedPlatforms.filter((p) => p === "google" || p === "meta" || p === "microsoft"),
    [stackedPlatforms],
  );
  const totalsPlatformKey = useMemo(
    () => totalsPlatforms.slice().sort().join(","),
    [totalsPlatforms],
  );

  const primariesQuery = useQuery({
    queryKey: leadGenKeys.primaryMetrics(client.id, clientType, rangeQueryKey),
    queryFn: () => fetchPrimaryMetricsForView(supabase, client.id, clientType, rangeOptions),
  });

  const spendQuery = useQuery({
    queryKey: leadGenKeys.spendBudget(client.id),
    queryFn: () => fetchSpendAndBudgetCap(supabase, client.id),
  });

  const alertQuery = useQuery({
    queryKey: leadGenKeys.alerts(client.id),
    queryFn: () => fetchClientHasAlert(supabase, client.id),
  });

  const bannerQuery = useQuery({
    queryKey: leadGenKeys.conversionBanner(client.id),
    queryFn: () => fetchShowUnconfiguredBanner(supabase, client.id),
    enabled: open,
  });

  const totalsQuery = useQuery({
    queryKey: leadGenKeys.platformTotals(client.id, totalsPlatformKey, rangeQueryKey),
    queryFn: () => fetchPlatformTotals(supabase, client.id, totalsPlatforms, rangeOptions),
    enabled: open && totalsPlatforms.length > 0,
  });
  const pacingQuery = useQuery({
    queryKey: leadGenKeys.platformBudgetPacing(client.id, totalsPlatformKey),
    queryFn: () => fetchPlatformBudgetPacing(supabase, client.id, totalsPlatforms),
    enabled: open && totalsPlatforms.length > 0,
  });
  const heroSeriesQuery = useQuery({
    queryKey: leadGenKeys.heroSeries(client.id, totalsPlatformKey, heroMode, rangeQueryKey),
    queryFn: () => fetchClientHeroSeries(supabase, client.id, totalsPlatforms, rangeOptions),
    enabled: open && totalsPlatforms.length > 0,
  });

  const primaries = primariesQuery.data ?? [];
  const spend = spendQuery.data;
  const hasAlert = alertQuery.data ?? false;
  const showUnconfiguredBanner = bannerQuery.data ?? false;
  const leadQualityLabel =
    client.leadQualityScore == null ? "N/A" : client.leadQualityScore.toFixed(1);

  const pacingByPlatform = useMemo(() => {
    const m = new Map<string, PlatformBudgetPacingRow>();
    for (const r of pacingQuery.data ?? []) m.set(r.platform, r);
    return m;
  }, [pacingQuery.data]);

  const rowBusy =
    platformsQuery.isLoading ||
    primariesQuery.isLoading ||
    spendQuery.isLoading ||
    alertQuery.isLoading;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-stretch">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-0 flex-1 flex-col gap-3 p-3 text-left transition hover:bg-zinc-50 sm:flex-row sm:items-center sm:gap-4 sm:p-3.5 dark:hover:bg-zinc-800/60"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2 sm:w-44 sm:shrink-0">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center text-zinc-500 transition dark:text-zinc-400 ${
              open ? "rotate-90" : ""
            }`}
            aria-hidden
          >
            <ChevronIcon />
          </span>
          <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {client.name}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6">
          {platformsQuery.isLoading ? (
            <SkeletonLine className="h-7 w-28" />
          ) : platforms.length > 0 ? (
            <PlatformIconRow keys={platforms} />
          ) : (
            <span className="text-xs text-zinc-400">No platforms</span>
          )}

          {rowBusy ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="min-w-[72px] space-y-1">
                  <SkeletonLine className="h-3 w-14" />
                  <SkeletonLine className="h-5 w-12" />
                </div>
              ))}
            </>
          ) : primaries.length > 0 ? (
            <>
              {primaries.map((metric) => (
                <CompactMetricCell
                  key={metric.id}
                  label={metric.label}
                  value={metric.value}
                  wow={metric.wowPct}
                  valueKind={metric.valueKind}
                />
              ))}
            </>
          ) : (
            <MetricPlaceholder label="Conversions" />
          )}

          <div className="ml-auto flex shrink-0 items-center gap-4 sm:ml-0">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Spend
              </p>
              {spendQuery.isLoading ? (
                <SkeletonLine className="mt-1 h-5 w-16" />
              ) : (
                <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatUsdFromCents(spend?.totalSpendCents ?? 0)}
                </p>
              )}
            </div>
            {spendQuery.isLoading ? (
              <SkeletonLine className="h-8 w-32" />
            ) : (
              <BudgetPacingBar
                spent={spend?.totalSpendCents ?? 0}
                cap={spend?.budgetCapCents ?? 1}
                daysElapsed={spend?.daysElapsed ?? 0}
                totalDaysInMonth={spend?.totalDaysInMonth ?? 30}
              />
            )}
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Lead quality
              </p>
              <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {leadQualityLabel}
              </p>
            </div>
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center"
              title={hasAlert ? "Alerts on this client" : "No alerts"}
            >
              {hasAlert ? (
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-red-200 dark:ring-red-950" />
              ) : (
                <span className="inline-block h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              )}
            </span>
          </div>
        </div>
      </button>
        {!embedded ? (
        <Link
          href={`/settings/clients/${client.id}/conversions`}
          onClick={(e) => e.stopPropagation()}
          className="flex w-11 shrink-0 items-center justify-center border-l border-zinc-200 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Conversion settings"
          title="Conversion settings"
        >
          <Settings className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </Link>
        ) : null}
      </div>

      {open ? (
        <div className="border-t border-zinc-200 bg-zinc-50/80 px-3 py-4 dark:border-zinc-800 dark:bg-zinc-950/50 sm:px-4">
          {platforms.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Connect a platform or ingest performance data to see tabs.
            </p>
          ) : (
            <>
              {totalsPlatforms.length > 0 ? (
                <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Total summary
                  </h4>
                  {pacingQuery.isLoading ? (
                    <SkeletonLine className="h-24 w-full rounded-lg" />
                  ) : pacingQuery.isError ? (
                    <p className="text-sm text-red-600">
                      {(pacingQuery.error as Error).message}
                    </p>
                  ) : (
                    <TotalSummaryBudgetPacing rows={pacingQuery.data ?? []} />
                  )}
                </div>
              ) : null}

              {totalsPlatforms.length > 0 ? (
                heroSeriesQuery.isLoading ? (
                  <SkeletonLine className="mb-8 h-72 w-full rounded-lg" />
                ) : heroSeriesQuery.isError ? (
                  <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="text-sm text-red-600">{(heroSeriesQuery.error as Error).message}</p>
                  </div>
                ) : (
                  <ClientHeroChart
                    data={heroSeriesQuery.data ?? []}
                    mode={heroMode}
                    onModeChange={setHeroMode}
                  />
                )
              ) : null}

              {totalsPlatforms.length > 0 ? (
                <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Total across platforms
                  </h4>
                  {totalsQuery.isLoading ? (
                    <SkeletonLine className="h-16 w-full rounded-lg" />
                  ) : totalsQuery.isError ? (
                    <p className="text-sm text-red-600">
                      {(totalsQuery.error as Error).message}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <SummaryCell
                        label="Spend"
                        value={formatUsdFromCents(totalsQuery.data?.spendCents ?? 0)}
                      />
                      <SummaryCell
                        label="Impressions"
                        value={(totalsQuery.data?.impressions ?? 0).toLocaleString("en-US")}
                      />
                      <SummaryCell
                        label="Clicks"
                        value={(totalsQuery.data?.clicks ?? 0).toLocaleString("en-US")}
                      />
                      <SummaryCell
                        label="Conversions"
                        value={(totalsQuery.data?.conversions ?? 0).toLocaleString("en-US")}
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {stackedPlatforms.map((p) => {
                const isAds = p === "google" || p === "meta" || p === "microsoft";
                const row = pacingByPlatform.get(p) ?? null;
                const adsBudgetPacing = !isAds
                  ? undefined
                  : totalsPlatforms.length === 0
                    ? undefined
                    : pacingQuery.isLoading
                      ? ({ kind: "loading" } as const)
                      : pacingQuery.isError
                        ? ({
                            kind: "error" as const,
                            message: (pacingQuery.error as Error).message,
                          } as const)
                        : row
                          ? ({ kind: "ready" as const, row } as const)
                          : ({
                              kind: "error" as const,
                              message: "Missing budget pacing for this platform.",
                            } as const);
                return (
                  <section key={p} className="mb-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                    <div
                      className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                      style={{ borderLeftWidth: "4px", borderLeftColor: platformAccent(p) }}
                    >
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {platformLabel(p)}
                    </h4>
                    <PlatformTabPanel
                      clientId={client.id}
                      platform={p}
                      clientType={clientType}
                      totalsPlatformKey={totalsPlatformKey}
                      adsBudgetPacing={adsBudgetPacing}
                    />
                    </div>
                  </section>
                );
              })}

              {bannerQuery.isLoading ? (
                <div className="mt-6">
                  <SkeletonLine className="h-14 w-full rounded-lg" />
                </div>
              ) : showUnconfiguredBanner ? (
                <div className="mt-6">
                  <UnconfiguredConversionsBanner />
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/50">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

function pacingPct(spent: number, budget: number, daysElapsed: number, totalDaysInMonth: number) {
  const targetSpend =
    budget > 0 && totalDaysInMonth > 0 ? (budget * daysElapsed) / totalDaysInMonth : 0;
  if (targetSpend <= 0) return 0;
  return (spent / targetSpend) * 100;
}

function pacingColor(pct: number, budget: number): {
  text: string;
  bar: string;
  tone: "green" | "amber" | "red";
} {
  if (budget <= 0 || !Number.isFinite(pct) || pct <= 0) {
    return { text: "text-amber-700 dark:text-amber-300", bar: "bg-amber-500", tone: "amber" };
  }
  if (pct < 70 || pct > 130) {
    return { text: "text-red-700 dark:text-red-300", bar: "bg-red-500", tone: "red" };
  }
  if (pct < 85 || pct > 115) {
    return { text: "text-amber-700 dark:text-amber-300", bar: "bg-amber-500", tone: "amber" };
  }
  return { text: "text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500", tone: "green" };
}

function TotalSummaryBudgetPacing({ rows }: { rows: PlatformBudgetPacingRow[] }) {
  const totals = rows.reduce(
    (acc, r) => ({
      budget: acc.budget + r.budgetCents,
      spent: acc.spent + r.spentToDateCents,
      projected: acc.projected + r.projectedMonthEndCents,
      daysElapsed: Math.max(acc.daysElapsed, r.daysElapsed),
      totalDaysInMonth: Math.max(acc.totalDaysInMonth, r.totalDaysInMonth),
    }),
    { budget: 0, spent: 0, projected: 0, daysElapsed: 0, totalDaysInMonth: 0 },
  );
  const { budget, spent, projected, daysElapsed, totalDaysInMonth } = totals;
  const pct = pacingPct(spent, budget, daysElapsed, totalDaysInMonth);
  const color = pacingColor(pct, budget);
  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
          <BudgetStat label="Combined budget" value={formatUsdFromCents(budget)} />
          <BudgetStat label="Spent to date" value={formatUsdFromCents(spent)} />
          <BudgetStat label="Projected month-end" value={formatUsdFromCents(projected)} />
        </div>
        <span className={`shrink-0 text-xs font-semibold sm:pt-1 ${color.text}`}>
          {budget > 0 ? `${pct.toFixed(0)}% pacing` : "No budget set"}
        </span>
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
          <span>Pacing vs target (all ad platforms)</span>
          <span className="tabular-nums">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full ${color.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function BudgetStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900/50">
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</div>
    </div>
  );
}

function formatPrimaryDisplay(
  value: number,
  kind: "count" | "currency" | "ratio" | undefined,
) {
  if (kind === "currency") {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (kind === "ratio") {
    return `${value.toFixed(2)}x`;
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function CompactMetricCell({
  label,
  value,
  wow,
  valueKind,
}: {
  label: string;
  value: number;
  wow: number;
  valueKind?: "count" | "currency" | "ratio";
}) {
  const k = valueKind ?? "count";
  const positive = wow > 0;
  const negative = wow < 0;
  const deltaCls = negative
    ? "text-red-600 dark:text-red-400"
    : positive
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-zinc-400 dark:text-zinc-500";

  return (
    <div className="min-w-[68px] max-w-[92px] shrink-0">
      <p
        className="truncate text-[10px] font-medium text-zinc-500 dark:text-zinc-400"
        title={label}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatPrimaryDisplay(value, k)}
        </p>
        <span className={`text-[10px] font-medium tabular-nums ${deltaCls}`}>
          {negative ? "↓" : positive ? "↑" : "—"}
          {wow !== 0 ? `${Math.abs(wow).toFixed(0)}%` : ""}
        </span>
      </div>
    </div>
  );
}

function MetricPlaceholder({ label }: { label: string }) {
  return (
    <div className="min-w-[68px] shrink-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="text-sm text-zinc-400">—</p>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
    </svg>
  );
}
