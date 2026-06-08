"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useDashboardDateRange } from "@/contexts/dashboard-date-range-context";
import {
  fetchConversionBreakdown,
  fetchGhlDashboard,
} from "@/lib/queries/lead-gen-queries";
import { comparisonPeriodLabel } from "@/lib/lead-gen/date-windows";
import { leadGenKeys } from "@/lib/queries/lead-gen-query-keys";
import { createClient } from "@/lib/supabase/client";

import { ConversionBreakdownTable } from "@/components/marketing/conversion-breakdown-table";
import { KpiCards } from "@/components/marketing/kpi-cards";
import {
  ConversionTableSkeleton,
  FunnelSkeleton,
  GhlGroupsSkeleton,
  KpiCardsSkeleton,
} from "@/components/marketing/skeletons";

type Props = {
  clientId: string;
};

export function GhlTabPanel({ clientId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { preset, customStart, customEnd, comparison, rangeQueryKey } =
    useDashboardDateRange();
  const rangeOptions = useMemo(
    () => ({ preset, customStart, customEnd, comparison }),
    [preset, customStart, customEnd, comparison],
  );
  const comparisonLabel = useMemo(() => comparisonPeriodLabel(comparison), [comparison]);

  const dash = useQuery({
    queryKey: leadGenKeys.ghlDashboard(clientId),
    queryFn: () => fetchGhlDashboard(supabase, clientId),
  });

  const conv = useQuery({
    queryKey: leadGenKeys.conversionBreakdown(clientId, "ghl", rangeQueryKey),
    queryFn: () => fetchConversionBreakdown(supabase, clientId, "ghl", rangeOptions),
  });

  const maxCount = useMemo(() => {
    const f = dash.data?.funnel ?? [];
    return Math.max(...f.map((s) => s.count), 1);
  }, [dash.data?.funnel]);

  return (
    <div className="space-y-6">
      {dash.isLoading ? (
        <KpiCardsSkeleton />
      ) : dash.isError ? (
        <p className="text-sm text-red-600">Could not load GHL KPIs.</p>
      ) : (
        <KpiCards items={dash.data?.kpis ?? []} comparisonLabel={comparisonLabel} />
      )}

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          GHL metric groups
        </h4>
        {dash.isLoading ? (
          <GhlGroupsSkeleton />
        ) : dash.isError ? (
          <p className="text-sm text-red-600">Could not load GHL groups.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(dash.data?.groups ?? []).map((group) => (
              <div
                key={group.title}
                className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                  {group.title}
                </p>
                <ul className="mt-2 space-y-2">
                  {group.metrics.map((m) => (
                    <li
                      key={m.label}
                      className="flex items-baseline justify-between gap-2 text-sm"
                    >
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {m.label}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {m.value}
                        </span>
                        {m.wow ? (
                          <span className="ml-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {m.wow}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Full funnel
        </h4>
        {dash.isLoading ? (
          <FunnelSkeleton />
        ) : dash.isError ? (
          <p className="text-sm text-red-600">Could not load pipeline funnel.</p>
        ) : (dash.data?.funnel.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No pipeline snapshot for this client yet.
          </p>
        ) : (
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            {(dash.data?.funnel ?? []).map((stage) => {
              const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
              return (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {stage.stage}
                  </span>
                  <div className="relative h-8 min-w-0 flex-1 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-600 dark:to-indigo-400"
                      style={{
                        width: `${Math.max(widthPct, stage.count > 0 ? 4 : 0)}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Conversion breakdown
        </h4>
        {conv.isLoading ? (
          <ConversionTableSkeleton />
        ) : conv.isError ? (
          <p className="text-sm text-red-600">Could not load conversions.</p>
        ) : (
          <ConversionBreakdownTable groups={conv.data ?? []} />
        )}
      </div>
    </div>
  );
}
