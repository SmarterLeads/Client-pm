import type {
  LocationBreakdownState,
  LocationBreakdownTable,
  LocationComparePair,
  LocationMonthRow,
} from "@/lib/marketing/report/hudson-location-breakdown";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWhole(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatRoas(spend: number, roas: number): string {
  if (spend <= 0 || roas <= 0) return "—";
  return `${roas.toFixed(2)}x`;
}

const thMonth = "w-[70px] px-2 py-1.5 text-left align-middle font-semibold";
const thMetric =
  "px-2 py-1.5 text-right align-middle font-semibold tabular-nums whitespace-nowrap";
const tdMonth = "w-[70px] px-2 py-1.5 text-left font-medium leading-tight";
const tdMetric = "px-2 py-1.5 text-right tabular-nums text-zinc-700 whitespace-nowrap";

function YearTable({ title, table }: { title: string; table: LocationBreakdownTable }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h4>
      <div className="rounded-lg border border-zinc-200">
        <table className="w-full table-fixed border-collapse text-[11px]">
          <colgroup>
            <col className="w-[70px]" />
            <col />
            <col />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 uppercase tracking-wide text-zinc-500">
              <th className={thMonth}>Month</th>
              <th className={thMetric}>Purch.</th>
              <th className={thMetric}>Spent</th>
              <th className={thMetric}>Sales</th>
              <th className={thMetric}>ROAS</th>
              <th className={thMetric}>Forms</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <LocationRow key={`${table.yearLabel}-${r.monthKey}`} row={r} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LocationRow({ row }: { row: LocationMonthRow }) {
  const showDash = row.isFutureMonth === true && !row.isGrandTotal;

  return (
    <tr
      className={
        row.isGrandTotal
          ? "border-t border-zinc-200 bg-zinc-50 font-semibold text-zinc-900"
          : "border-b border-zinc-100 last:border-0"
      }
    >
      <td className={tdMonth}>{row.monthLabel}</td>
      <td className={tdMetric}>
        {showDash ? "—" : formatWhole(row.purchases)}
      </td>
      <td className={tdMetric}>{showDash ? "—" : formatCurrency(row.spend)}</td>
      <td className={tdMetric}>{showDash ? "—" : formatCurrency(row.sales)}</td>
      <td className={tdMetric}>
        {showDash ? "—" : formatRoas(row.spend, row.roas)}
      </td>
      <td className={tdMetric}>
        {showDash ? "—" : formatWhole(row.contactForms)}
      </td>
    </tr>
  );
}

function ComparePairBlock({ pair }: { pair: LocationComparePair }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="mb-2 text-center text-sm font-semibold text-zinc-900">{pair.locationName}</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <YearTable title={`${pair.locationName} 2026`} table={pair.table2026} />
        <YearTable title={`${pair.locationName} 2025`} table={pair.table2025} />
      </div>
    </div>
  );
}

export function LocationBreakdownSection({ state }: { state: LocationBreakdownState }) {
  if (!state.aggregate && !state.locations.length) return null;

  return (
    <>
      <h2 className="mb-4 text-center text-base font-semibold text-zinc-900">
        Performance by Location
      </h2>
      <section className="mb-12 space-y-2">
        {state.aggregate ? <ComparePairBlock pair={state.aggregate} /> : null}
        {state.locations.map((pair) => (
          <ComparePairBlock key={pair.locationName} pair={pair} />
        ))}
      </section>
    </>
  );
}
