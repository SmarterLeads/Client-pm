import type { KpiStat } from "@/lib/marketing/report/client-report-metrics";
import { GhlYtdTable } from "@/components/marketing/report/ghl-ytd-table";
import {
  formatGhlMetricValue,
  ghlMetricColumns,
  type BackClinicsSourceBreakdownRow,
  type GhlFourMetrics,
  type GhlLeadSourceRow,
  type GhlReportData,
} from "@/lib/marketing/report/ghl-report-metrics";

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
        Prior period: {formatKpiDisplayValue(kpi, kpi.prior)}
      </p>
      <p className={`mt-1 text-xs font-medium ${favorable ? "text-emerald-600" : "text-red-600"}`}>
        {arrow} {Math.abs(deltaPct).toFixed(1)}%
      </p>
    </div>
  );
}

type GhlHeroCardsProps = {
  heroKpis: KpiStat[];
  accentColor: string;
  useBackClinicsCustomFields?: boolean;
  className?: string;
};

export function GhlHeroCards({
  heroKpis,
  accentColor,
  useBackClinicsCustomFields,
  className,
}: GhlHeroCardsProps) {
  const heroGridClass = useBackClinicsCustomFields
    ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
    : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4";

  return (
    <section className={[heroGridClass, className].filter(Boolean).join(" ")}>
      {heroKpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} accentColor={accentColor} />
      ))}
    </section>
  );
}

const TABLE_CELL = "px-4 py-2";
const TABLE_FIRST_COL = `${TABLE_CELL} text-left`;
const TABLE_METRIC_COL = `${TABLE_CELL} text-center`;

function MetricsCells({
  metrics,
  columns,
}: {
  metrics: GhlFourMetrics;
  columns: ReturnType<typeof ghlMetricColumns>;
}) {
  return (
    <>
      {columns.map((col) => (
        <td key={col.key} className={`${TABLE_METRIC_COL} text-sm text-zinc-800`}>
          {formatGhlMetricValue(col.key, metrics[col.key])}
        </td>
      ))}
    </>
  );
}

function formatBackClinicsRevenue(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatBackClinicsCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function BackClinicsSourceTable({
  rows,
  accentColor,
}: {
  rows: BackClinicsSourceBreakdownRow[];
  accentColor: string;
}) {
  const totals = rows.reduce(
    (acc, row) => ({
      leads: acc.leads + row.leads,
      appointmentsBooked: acc.appointmentsBooked + row.appointmentsBooked,
      consultations: acc.consultations + row.consultations,
      customers: acc.customers + row.customers,
      revenue: acc.revenue + row.revenue,
    }),
    {
      leads: 0,
      appointmentsBooked: 0,
      consultations: 0,
      customers: 0,
      revenue: 0,
    },
  );

  return (
    <section>
      <h2 className="mb-4 text-center text-base font-semibold text-zinc-900">
        Performance by Source
      </h2>
      <div
        className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6"
        style={{ borderTopWidth: "3px", borderTopColor: accentColor }}
      >
        {rows.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">
            No source data yet for this period. Run a GHL sync to populate opportunities.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                  <th className={`${TABLE_FIRST_COL} font-semibold`}>Source</th>
                  <th className={`${TABLE_METRIC_COL} font-semibold`}>Leads</th>
                  <th className={`${TABLE_METRIC_COL} font-semibold`}>Appt Booked</th>
                  <th className={`${TABLE_METRIC_COL} font-semibold`}>Consultation</th>
                  <th className={`${TABLE_METRIC_COL} font-semibold`}>Customers</th>
                  <th className={`${TABLE_METRIC_COL} font-semibold`}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.source} className="border-b border-zinc-100">
                    <td className={`${TABLE_FIRST_COL} text-sm font-medium text-zinc-900`}>
                      {row.source}
                    </td>
                    <td className={`${TABLE_METRIC_COL} text-sm text-zinc-800`}>
                      {formatBackClinicsCount(row.leads)}
                    </td>
                    <td className={`${TABLE_METRIC_COL} text-sm text-zinc-800`}>
                      {formatBackClinicsCount(row.appointmentsBooked)}
                    </td>
                    <td className={`${TABLE_METRIC_COL} text-sm text-zinc-800`}>
                      {formatBackClinicsCount(row.consultations)}
                    </td>
                    <td className={`${TABLE_METRIC_COL} text-sm text-zinc-800`}>
                      {formatBackClinicsCount(row.customers)}
                    </td>
                    <td className={`${TABLE_METRIC_COL} text-sm text-zinc-800`}>
                      {formatBackClinicsRevenue(row.revenue)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-zinc-200 bg-zinc-50 font-bold">
                  <td className={`${TABLE_FIRST_COL} text-sm text-zinc-900`}>Total</td>
                  <td className={`${TABLE_METRIC_COL} text-sm text-zinc-900`}>
                    {formatBackClinicsCount(totals.leads)}
                  </td>
                  <td className={`${TABLE_METRIC_COL} text-sm text-zinc-900`}>
                    {formatBackClinicsCount(totals.appointmentsBooked)}
                  </td>
                  <td className={`${TABLE_METRIC_COL} text-sm text-zinc-900`}>
                    {formatBackClinicsCount(totals.consultations)}
                  </td>
                  <td className={`${TABLE_METRIC_COL} text-sm text-zinc-900`}>
                    {formatBackClinicsCount(totals.customers)}
                  </td>
                  <td className={`${TABLE_METRIC_COL} text-sm text-zinc-900`}>
                    {formatBackClinicsRevenue(totals.revenue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function LeadSourceTable({
  rows,
  columns,
}: {
  rows: GhlLeadSourceRow[];
  columns: ReturnType<typeof ghlMetricColumns>;
}) {
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
            {columns.map((col) => (
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
              <MetricsCells metrics={row.current} columns={columns} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GhlReportTab({ data, accentColor }: Props) {
  const columns = ghlMetricColumns(data.useBackClinicsCustomFields);

  return (
    <div className="space-y-10">
      <GhlHeroCards
        heroKpis={data.heroKpis}
        accentColor={accentColor}
        useBackClinicsCustomFields={data.useBackClinicsCustomFields}
      />

      {data.useBackClinicsCustomFields && data.backClinicsSourceBreakdown ? (
        <BackClinicsSourceTable
          rows={data.backClinicsSourceBreakdown}
          accentColor={accentColor}
        />
      ) : null}

      {!data.useBackClinicsCustomFields ? (
        <section>
          <h2 className="mb-4 text-center text-base font-semibold text-zinc-900">Lead Source</h2>
          <div
            className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6"
            style={{ borderTopWidth: "3px", borderTopColor: accentColor }}
          >
            <LeadSourceTable rows={data.leadSourceRows} columns={columns} />
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-center text-base font-semibold text-zinc-900">Year to Date</h2>
        <div
          className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6"
          style={{ borderTopWidth: "3px", borderTopColor: accentColor }}
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-6">
            <GhlYtdTable
              title={`${data.currentYear} Year to Date`}
              rows={data.ytdCurrentYear}
              useBackClinicsCustomFields={data.useBackClinicsCustomFields}
            />
            <GhlYtdTable
              title={`${data.priorYear}`}
              rows={data.ytdPriorYear}
              useBackClinicsCustomFields={data.useBackClinicsCustomFields}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
