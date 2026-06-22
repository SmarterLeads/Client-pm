import {
  formatGhlMetricValue,
  ghlMetricColumns,
  type GhlFourMetrics,
  type GhlYtdMonthRow,
} from "@/lib/marketing/report/ghl-report-metrics";

const TABLE_CELL = "px-4 py-2";
const TABLE_FIRST_COL = `${TABLE_CELL} text-left`;
const TABLE_METRIC_COL = `${TABLE_CELL} w-20 text-center`;

function YtdMetricHeader({
  metricKey,
  label,
}: {
  metricKey: keyof GhlFourMetrics;
  label: string;
}) {
  if (metricKey === "bookedAppointments") {
    return (
      <span className="inline-flex flex-col leading-tight normal-case">
        <span>Appt.</span>
        <span>Booked</span>
      </span>
    );
  }
  if (metricKey === "consultationAttended") {
    return (
      <span className="inline-flex flex-col leading-tight normal-case">
        <span>Consult</span>
        <span>Attended</span>
      </span>
    );
  }
  if (metricKey === "value") {
    return (
      <span className="inline-flex flex-col leading-tight normal-case">
        <span>{label === "Revenue" ? "Revenue" : "Sales"}</span>
        {label !== "Revenue" ? <span>Value</span> : null}
      </span>
    );
  }
  return label;
}

function YtdMetricsCells({
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

type Props = {
  title: string;
  rows: GhlYtdMonthRow[];
  useBackClinicsCustomFields?: boolean;
};

export function GhlYtdTable({ title, rows, useBackClinicsCustomFields }: Props) {
  const columns = ghlMetricColumns(useBackClinicsCustomFields);

  return (
    <div className="min-w-0 flex-1">
      <h3 className="mb-3 text-center text-sm font-semibold text-zinc-800">{title}</h3>
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
            <th className={`${TABLE_FIRST_COL} font-semibold`}>Month</th>
            {columns.map((col) => (
              <th key={col.key} className={`${TABLE_METRIC_COL} font-semibold`}>
                <YtdMetricHeader metricKey={col.key} label={col.label} />
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
                columns.map((col) => (
                  <td key={col.key} className={`${TABLE_METRIC_COL} text-sm text-zinc-400`}>
                    —
                  </td>
                ))
              ) : (
                <YtdMetricsCells metrics={row.metrics} columns={columns} />
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
