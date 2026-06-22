import type { YtdMonthTableRow } from "@/lib/marketing/report/report-tab-platform";

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

function formatRoas(value: number | undefined, spend: number): string {
  if (spend <= 0 || value == null || value <= 0) return "—";
  return `${value.toFixed(1)}x`;
}

function colShown(m: Record<string, boolean> | undefined, key: string): boolean {
  if (!m) return true;
  return m[key] !== false;
}

type Props = {
  rows: YtdMonthTableRow[];
  /** When set, gates conversions / cost per conversion / avg CPC from campaign table metric config. */
  columnVisibility?: Record<string, boolean>;
  /** Meta ecommerce: Purchases / Purchase Value / ROAS instead of Conversions / Cost per conversion. */
  useEcommerceColumns?: boolean;
  /** Hudson Table overview: Month, Spend, Conversions, Purchases, Purchase Value. */
  useHudsonOverviewColumns?: boolean;
  /** Back Clinics: Month, Spend, Conversions, Cost per Conversion. */
  useBackClinicsSlimYtdColumns?: boolean;
  /** TikTok: hide Impressions to reduce horizontal scroll. */
  hideTikTokColumns?: boolean;
};

function metricCell(
  r: YtdMonthTableRow,
  key: "impressions" | "clicks" | "spend" | "conversions" | "avgCpc" | "cpl",
) {
  if (r.isFutureMonth) {
    return "—";
  }
  if (key === "impressions") return formatWhole(r.impressions);
  if (key === "clicks") return formatWhole(r.clicks);
  if (key === "spend") return formatCurrency(r.spend);
  if (key === "conversions") return formatWhole(r.conversions);
  if (key === "avgCpc") return r.clicks > 0 ? formatCurrency(r.avgCpc) : "—";
  return r.conversions > 0 ? formatCurrency(r.costPerConversion) : "—";
}

function ecommerceMetricCell(
  r: YtdMonthTableRow,
  key: "spend" | "purchases" | "purchaseValue" | "roas",
) {
  if (r.isFutureMonth) {
    return "—";
  }
  if (key === "spend") return formatCurrency(r.spend);
  if (key === "purchases") return formatWhole(r.purchases ?? 0);
  if (key === "purchaseValue") return formatCurrency(r.purchaseValue ?? 0);
  return formatRoas(r.roas, r.spend);
}

export function YtdMonthlyTable({
  rows,
  columnVisibility,
  useEcommerceColumns = false,
  useHudsonOverviewColumns = false,
  useBackClinicsSlimYtdColumns = false,
  hideTikTokColumns = false,
}: Props) {
  const thMonth = "w-24 px-2 py-2.5";
  const thMetric = "w-20 px-2 py-2.5 text-center tabular-nums";
  const tdMonth = "w-24 px-2 py-2 font-medium text-zinc-900";
  const tdMetric = "w-20 px-2 py-2 text-center tabular-nums text-zinc-700";

  return (
    <div className="rounded-lg border border-zinc-200">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className={thMonth}>Month</th>
            {useBackClinicsSlimYtdColumns ? (
              <>
                <th className={thMetric}>Spend</th>
                <th className={thMetric}>Conversions</th>
                <th className={thMetric}>Cost per Conversion</th>
              </>
            ) : useHudsonOverviewColumns ? (
              <>
                <th className={thMetric}>Spend</th>
                <th className={thMetric}>Conv.</th>
                <th className={thMetric}>Purch.</th>
                <th className={thMetric}>Value</th>
              </>
            ) : useEcommerceColumns ? (
              <>
                <th className={thMetric}>Spend</th>
                <th className={thMetric}>Purch.</th>
                <th className={thMetric}>Value</th>
                <th className={thMetric}>ROAS</th>
              </>
            ) : (
              <>
                {hideTikTokColumns ? null : (
                  <th className={thMetric}>Impr.</th>
                )}
                <th className={thMetric}>Clicks</th>
                <th className={thMetric}>Spend</th>
                {colShown(columnVisibility, "avgCpc") ? (
                  <th className={thMetric}>CPC</th>
                ) : null}
                {colShown(columnVisibility, "conversions") ? (
                  <th className={thMetric}>Conv.</th>
                ) : null}
                {colShown(columnVisibility, "cpl") ? (
                  <th className={thMetric}>Cost/Conv</th>
                ) : null}
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.monthLabel} className="border-b border-zinc-100 last:border-0">
              <td className={tdMonth}>{r.monthLabel}</td>
              {useBackClinicsSlimYtdColumns ? (
                <>
                  <td className={tdMetric}>{metricCell(r, "spend")}</td>
                  <td className={tdMetric}>{metricCell(r, "conversions")}</td>
                  <td className={tdMetric}>{metricCell(r, "cpl")}</td>
                </>
              ) : useHudsonOverviewColumns ? (
                <>
                  <td className={tdMetric}>{metricCell(r, "spend")}</td>
                  <td className={tdMetric}>{metricCell(r, "conversions")}</td>
                  <td className={tdMetric}>{ecommerceMetricCell(r, "purchases")}</td>
                  <td className={tdMetric}>{ecommerceMetricCell(r, "purchaseValue")}</td>
                </>
              ) : useEcommerceColumns ? (
                <>
                  <td className={tdMetric}>{metricCell(r, "spend")}</td>
                  <td className={tdMetric}>{ecommerceMetricCell(r, "purchases")}</td>
                  <td className={tdMetric}>{ecommerceMetricCell(r, "purchaseValue")}</td>
                  <td className={tdMetric}>{ecommerceMetricCell(r, "roas")}</td>
                </>
              ) : (
                <>
                  {hideTikTokColumns ? null : (
                    <td className={tdMetric}>{metricCell(r, "impressions")}</td>
                  )}
                  <td className={tdMetric}>{metricCell(r, "clicks")}</td>
                  <td className={tdMetric}>{metricCell(r, "spend")}</td>
                  {colShown(columnVisibility, "avgCpc") ? (
                    <td className={tdMetric}>{metricCell(r, "avgCpc")}</td>
                  ) : null}
                  {colShown(columnVisibility, "conversions") ? (
                    <td className={tdMetric}>{metricCell(r, "conversions")}</td>
                  ) : null}
                  {colShown(columnVisibility, "cpl") ? (
                    <td className={tdMetric}>{metricCell(r, "cpl")}</td>
                  ) : null}
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
