import type { KpiStat } from "@/lib/report/client-report-metrics";
import { GhlYtdTable } from "@/components/marketing/report/ghl-ytd-table";
import {
  formatGhlMetricValue,
  type GhlFourMetrics,
  type GhlLeadSourceRow,
  type GhlReportData,
} from "@/lib/report/ghl-report-metrics";

type Props = {
  data: GhlReportData;
  accentColor: string;
};

function formatKpiDisplayValue(kpi: KpiStat, value: number): string {
  if (kpi.format === "currency") {
    return formatGhlMetricValue("value", value);
  }
  return Math.round(value).toLocaleString("en-US");
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
        Prior month: {formatKpiDisplayValue(kpi, kpi.prior)}
      </p>
      <p className={`mt-1 text-xs font-medium ${favorable ? "text-emerald-600" : "text-red-600"}`}>
        {arrow} {Math.abs(deltaPct).toFixed(1)}%
      </p>
    </div>
  );
}

const TABLE_METRIC_COLUMNS: { key: keyof GhlFourMetrics; label: string }[] = [
  { key: "opportunitiesCreated", label: "Leads" },
  { key: "bookedAppointments", label: "Appt. Booked" },
  { key: "patientsClosed", label: "Customers" },
  { key: "value", label: "Sales Val." },
];

const TABLE_CELL = "px-4 py-2";
const TABLE_FIRST_COL = `${TABLE_CELL} text-left`;
const TABLE_METRIC_COL = `${TABLE_CELL} text-center`;

function MetricsCells({ metrics }: { metrics: GhlFourMetrics }) {
  return (
    <>
      {TABLE_METRIC_COLUMNS.map((col) => (
        <td key={col.key} className={`${TABLE_METRIC_COL} text-sm text-zinc-800`}>
          {formatGhlMetricValue(col.key, metrics[col.key])}
        </td>
      ))}
    </>
  );
}

function LeadSourceTable({ rows }: { rows: GhlLeadSourceRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-500">
        No lead source data yet. Run a GHL sync to populate contacts and opportunities.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
            <th className={`${TABLE_FIRST_COL} font-semibold`}>Lead Source</th>
            {TABLE_METRIC_COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`${TABLE_METRIC_COL} whitespace-nowrap font-semibold`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.source} className="border-b border-zinc-100">
              <td className={`${TABLE_FIRST_COL} text-sm font-medium text-zinc-900`}>
                {row.source}
              </td>
              <MetricsCells metrics={row.current} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GhlReportTab({ data, accentColor }: Props) {
  return (
    <div className="space-y-10">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <LeadSourceTable rows={data.leadSourceRows} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-center text-base font-semibold text-zinc-900">Year to Date</h2>
        <div
          className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6"
          style={{ borderTopWidth: "3px", borderTopColor: accentColor }}
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-6">
            <GhlYtdTable title={`${data.currentYear} Year to Date`} rows={data.ytdCurrentYear} />
            <GhlYtdTable title={`${data.priorYear}`} rows={data.ytdPriorYear} />
          </div>
        </div>
      </section>
    </div>
  );
}
