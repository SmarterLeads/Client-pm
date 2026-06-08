import {
  formatGhlMetricValue,
  type GhlFourMetrics,
  type GhlYtdMonthRow,
} from "@/lib/report/ghl-report-metrics";

const YTD_METRIC_COLUMNS: { key: keyof GhlFourMetrics; label: string }[] = [
  { key: "opportunitiesCreated", label: "Leads" },
  { key: "bookedAppointments", label: "Appt. Booked" },
  { key: "patientsClosed", label: "Customers" },
  { key: "value", label: "Sales Value" },
];

const TABLE_CELL = "px-4 py-2";
const TABLE_FIRST_COL = `${TABLE_CELL} text-left`;
const TABLE_METRIC_COL = `${TABLE_CELL} w-20 text-center`;

function YtdMetricHeader({ metricKey }: { metricKey: keyof GhlFourMetrics }) {
  if (metricKey === "bookedAppointments") {
    return (
      <span className="inline-flex flex-col leading-tight normal-case">
        <span>Appt.</span>
        <span>Booked</span>
      </span>
    );
  }
  if (metricKey === "value") {
    return (
      <span className="inline-flex flex-col leading-tight normal-case">
        <span>Sales</span>
        <span>Value</span>
      </span>
    );
  }
  const col = YTD_METRIC_COLUMNS.find((c) => c.key === metricKey);
  return col?.label ?? metricKey;
}

function YtdMetricsCells({ metrics }: { metrics: GhlFourMetrics }) {
  return (
    <>
      {YTD_METRIC_COLUMNS.map((col) => (
        <td key={col.key} className={`${TABLE_METRIC_COL} text-sm text-zinc-800`}>
          {formatGhlMetricValue(col.key, metrics[col.key])}
        </td>
      ))}
    </>
  );
}

type Props = {
  title: string;
  rows: GhlYtdMonthRow[];
};

export function GhlYtdTable({ title, rows }: Props) {
  return (
    <div className="min-w-0 flex-1">
      <h3 className="mb-3 text-center text-sm font-semibold text-zinc-800">{title}</h3>
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
            <th className={`${TABLE_FIRST_COL} font-semibold`}>Month</th>
            {YTD_METRIC_COLUMNS.map((col) => (
              <th key={col.key} className={`${TABLE_METRIC_COL} font-semibold`}>
                <YtdMetricHeader metricKey={col.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.monthKey} className="border-b border-zinc-100">
              <td className={`${TABLE_FIRST_COL} text-sm font-medium text-zinc-900`}>
                {row.monthLabel}
              </td>
              {row.isFutureMonth ? (
                YTD_METRIC_COLUMNS.map((col) => (
                  <td key={col.key} className={`${TABLE_METRIC_COL} text-sm text-zinc-400`}>
                    —
                  </td>
                ))
              ) : (
                <YtdMetricsCells metrics={row.metrics} />
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
