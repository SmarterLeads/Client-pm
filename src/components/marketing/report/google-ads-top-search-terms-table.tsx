"use client";

import type {
  GoogleAdsSearchTermsTableState,
  GoogleAdsSearchTermRow,
} from "@/lib/marketing/report/google-ads-search-terms-report";

function formatMoney(value: number, min = 2, max = 2): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

function formatWhole(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatConversions(value: number): string {
  if (Math.abs(value - Math.round(value)) < 1e-9) return formatWhole(value);
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCtrFractionAsPercent(frac: number): string {
  return `${(frac * 100).toFixed(2)}%`;
}

type Props = {
  primaryColor: string;
  state: GoogleAdsSearchTermsTableState;
};

export function GoogleAdsTopSearchTermsTable({ primaryColor, state }: Props) {
  const { rows, hasSearchTermRowsInRange, dataUnavailable } = state;
  const showEmpty =
    dataUnavailable ||
    !hasSearchTermRowsInRange ||
    rows.length === 0;

  if (showEmpty) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
        Search term data not available — run a sync to populate
      </div>
    );
  }

  const metricColCount = 7;
  const metricColWidthPct = 74 / metricColCount;
  const thLeft =
    "w-[26%] px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap";
  const thMetric =
    "px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap";
  const tdTerm =
    "w-[26%] max-w-0 px-2 py-2 text-left text-xs font-medium text-zinc-900 overflow-hidden text-ellipsis whitespace-nowrap";
  const tdMetric = "px-2 py-2 text-center text-xs tabular-nums text-zinc-800";

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 shadow-sm">
      <div className="max-h-[min(70vh,720px)] overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed border-collapse text-xs">
          <colgroup>
            <col style={{ width: "26%" }} />
            {Array.from({ length: metricColCount }, (_, i) => (
              <col key={i} style={{ width: `${metricColWidthPct}%` }} />
            ))}
          </colgroup>
          <thead
            className="sticky top-0 z-20 shadow-sm"
            style={{ backgroundColor: primaryColor, color: "#fff" }}
          >
            <tr>
              <th className={`${thLeft} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                Search Term
              </th>
              <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                Impressions
              </th>
              <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                Clicks
              </th>
              <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                CTR
              </th>
              <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                Avg CPC
              </th>
              <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                Spend
              </th>
              <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                Conversions
              </th>
              <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                Cost per Lead
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: GoogleAdsSearchTermRow, idx: number) => {
              const bg = idx % 2 === 0 ? "bg-white" : "bg-zinc-50";
              const cpl = r.costPerLead;
              return (
                <tr key={`${r.searchTerm}-${idx}`} className={`border-b border-zinc-100 ${bg}`}>
                  <td className={`${tdTerm} ${bg}`} title={r.searchTerm}>
                    {r.searchTerm}
                  </td>
                  <td className={`${tdMetric} ${bg}`}>{formatWhole(r.impressions)}</td>
                  <td className={`${tdMetric} ${bg}`}>{formatWhole(r.clicks)}</td>
                  <td className={`${tdMetric} ${bg}`}>{formatCtrFractionAsPercent(r.ctr)}</td>
                  <td className={`${tdMetric} ${bg}`}>{formatMoney(r.avgCpc)}</td>
                  <td className={`${tdMetric} ${bg}`}>{formatMoney(r.spend)}</td>
                  <td className={`${tdMetric} ${bg}`}>{formatConversions(r.conversions)}</td>
                  <td className={`${tdMetric} ${bg}`}>
                    {r.conversions > 0 ? formatMoney(cpl) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
