import type { KpiStat } from "@/lib/report/client-report-metrics";
import type { WhatConvertsReportDisplay } from "@/lib/report/whatconverts-config";
import {
  formatWhatConvertsMetricValue,
  getVisibleWhatConvertsMetricColumns,
  type WhatConvertsLeadSourceRow,
  type WhatConvertsLeadTypeCardRow,
  type WhatConvertsMetricColumn,
  type WhatConvertsMetrics,
  type WhatConvertsReportData,
  type WhatConvertsYtdRow,
} from "@/lib/report/whatconverts-report-metrics";

type Props = {
  data: WhatConvertsReportData;
  accentColor: string;
};

type MetricColumn = WhatConvertsMetricColumn;

function formatKpiDisplayValue(kpi: KpiStat, value: number): string {
  if (kpi.format === "currency") {
    return formatWhatConvertsMetricValue("salesValue", value);
  }
  return Math.round(value).toLocaleString("en-US");
}

function heroGridClass(count: number): string {
  if (count >= 3) return "grid grid-cols-1 gap-4 md:grid-cols-3";
  if (count === 2) return "grid grid-cols-1 gap-4 sm:grid-cols-2";
  return "grid grid-cols-1 gap-4";
}

function KpiCard({ kpi, accentColor }: { kpi: KpiStat; accentColor: string }) {
  const deltaPct = kpi.prior > 0 ? ((kpi.current - kpi.prior) / kpi.prior) * 100 : 0;
  const favorable = kpi.lowerIsBetter ? deltaPct <= 0 : deltaPct >= 0;
  const arrow = deltaPct >= 0 ? "▲" : "▼";

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white p-5 text-center"
      style={{ borderTopWidth: "3px", borderTopColor: accentColor }}
    >
      <p className="mb-2 text-base font-semibold leading-snug text-zinc-800">{kpi.label}</p>
      <p className="text-2xl font-bold tracking-tight text-zinc-900">
        {formatKpiDisplayValue(kpi, kpi.current)}
      </p>
      <p className="mt-2 text-xs text-zinc-400">
        Prior period: {formatKpiDisplayValue(kpi, kpi.prior)}
      </p>
      <p className={`mt-1 text-xs font-medium ${favorable ? "text-emerald-600" : "text-red-600"}`}>
        {arrow} {Math.abs(deltaPct).toFixed(1)}%
      </p>
    </div>
  );
}

function LeadTypeCard({
  card,
  accentColor,
  display,
}: {
  card: WhatConvertsLeadTypeCardRow;
  accentColor: string;
  display: WhatConvertsReportDisplay;
}) {
  const { current, prior } = card;
  const deltaPct =
    prior.uniqueLeads > 0
      ? ((current.uniqueLeads - prior.uniqueLeads) / prior.uniqueLeads) * 100
      : 0;
  const favorable = deltaPct >= 0;
  const arrow = deltaPct >= 0 ? "▲" : "▼";

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white p-5 text-center"
      style={{ borderTopWidth: "3px", borderTopColor: accentColor }}
    >
      <p className="mb-3 text-base font-semibold leading-snug text-zinc-800">{card.label}</p>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total Unique Leads</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">
        {formatWhatConvertsMetricValue("uniqueLeads", current.uniqueLeads)}
      </p>
      {!display.hideQuotable ? (
        <p className="mt-3 text-sm text-zinc-600">
          Quotable:{" "}
          <span className="font-semibold text-zinc-900">
            {formatWhatConvertsMetricValue("quotable", current.quotable)}
          </span>
        </p>
      ) : null}
      {!display.hideSalesValue ? (
        <p className={`mt-1 text-sm text-zinc-600 ${display.hideQuotable ? "mt-3" : ""}`}>
          Sales Value:{" "}
          <span className="font-semibold text-zinc-900">
            {formatWhatConvertsMetricValue("salesValue", current.salesValue)}
          </span>
        </p>
      ) : null}
      <p className="mt-3 text-xs text-zinc-400">
        Prior period: {formatWhatConvertsMetricValue("uniqueLeads", prior.uniqueLeads)}
      </p>
      <p className={`mt-1 text-xs font-medium ${favorable ? "text-emerald-600" : "text-red-600"}`}>
        {arrow} {Math.abs(deltaPct).toFixed(1)}%
      </p>
    </div>
  );
}

function MetricsCells({
  metrics,
  columns,
}: {
  metrics: WhatConvertsMetrics;
  columns: MetricColumn[];
}) {
  return (
    <>
      {columns.map((col) => (
        <td key={col.key} className="px-3 py-2 text-right text-sm text-zinc-800">
          {formatWhatConvertsMetricValue(col.key, metrics[col.key])}
        </td>
      ))}
    </>
  );
}

function LeadSourceTable({
  rows,
  columns,
}: {
  rows: WhatConvertsLeadSourceRow[];
  columns: MetricColumn[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-500">
        No lead source data yet. Run a WhatConverts sync to populate leads.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-2 font-semibold">Lead Source</th>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-right font-semibold">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.source} className="border-b border-zinc-100">
              <td className="px-3 py-2 text-sm font-medium text-zinc-900">{row.source}</td>
              <MetricsCells metrics={row.metrics} columns={columns} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadTypeCardGrid({
  cards,
  accentColor,
  display,
}: {
  cards: WhatConvertsLeadTypeCardRow[];
  accentColor: string;
  display: WhatConvertsReportDisplay;
}) {
  if (cards.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-500">
        Lead type cards are not configured for this client yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <LeadTypeCard
          key={card.label}
          card={card}
          accentColor={accentColor}
          display={display}
        />
      ))}
    </div>
  );
}

function YtdTable({
  title,
  rows,
  columns,
  fullWidth = false,
}: {
  title: string;
  rows: WhatConvertsYtdRow[];
  columns: MetricColumn[];
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "w-full" : "min-w-0 flex-1"}>
      <h3 className="mb-3 text-center text-sm font-semibold text-zinc-800">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-3 py-2 font-semibold">Month</th>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-right font-semibold">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.monthKey} className="border-b border-zinc-100">
                <td className="px-3 py-2 text-sm font-medium text-zinc-900">{row.monthLabel}</td>
                {row.isFutureMonth ? (
                  columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 text-right text-sm text-zinc-400">
                      —
                    </td>
                  ))
                ) : (
                  <MetricsCells metrics={row.metrics} columns={columns} />
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WhatConvertsReportTab({ data, accentColor }: Props) {
  const metricColumns = getVisibleWhatConvertsMetricColumns(data.display);

  return (
    <div className="space-y-10">
      <section className={heroGridClass(data.heroKpis.length)}>
        {data.heroKpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} accentColor={accentColor} />
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-center text-base font-semibold text-zinc-900">Lead Source</h2>
        <div
          className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6"
          style={{ borderTopWidth: "3px", borderTopColor: accentColor }}
        >
          <LeadSourceTable rows={data.leadSourceRows} columns={metricColumns} />
        </div>
      </section>

      {!data.display.hideLeadTypeSection ? (
        <section>
          <h2 className="mb-4 text-center text-base font-semibold text-zinc-900">Lead Type</h2>
          <LeadTypeCardGrid
            cards={data.leadTypeCards}
            accentColor={accentColor}
            display={data.display}
          />
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-center text-base font-semibold text-zinc-900">Year to Date</h2>
        <div
          className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6"
          style={{ borderTopWidth: "3px", borderTopColor: accentColor }}
        >
          <div
            className={
              data.display.hidePriorYearYtd
                ? "w-full"
                : "flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-6"
            }
          >
            <YtdTable
              title={`${data.currentYear} Year to Date`}
              rows={data.ytdCurrentYear}
              columns={metricColumns}
              fullWidth={data.display.hidePriorYearYtd}
            />
            {!data.display.hidePriorYearYtd ? (
              <YtdTable
                title={`${data.priorYear}`}
                rows={data.ytdPriorYear}
                columns={metricColumns}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
