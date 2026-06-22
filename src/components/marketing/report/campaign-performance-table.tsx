import type { CampaignTableRow } from "@/lib/marketing/report/report-tab-platform";

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

function formatPct(num: number, den: number): string {
  if (den <= 0) return "—";
  return `${((num / den) * 100).toFixed(2)}%`;
}

const thMetric = "px-3 py-2.5 text-center tabular-nums align-middle";
const tdMetric = "px-3 py-2 text-center tabular-nums text-zinc-700";

function colShown(m: Record<string, boolean> | undefined, key: string): boolean {
  if (!m) return true;
  return m[key] !== false;
}

function colOptIn(m: Record<string, boolean> | undefined, key: string): boolean {
  if (!m) return false;
  return m[key] === true;
}

function formatRoas(value: number | undefined, spend: number): string {
  if (spend <= 0 || value == null || value <= 0) return "—";
  return `${value.toFixed(1)}x`;
}

export function CampaignPerformanceTable({
  rows,
  useMetaReachColumns = false,
  useMetaEcommerceColumns = false,
  useGoogleEcommerceColumns = false,
  columnVisibility,
}: {
  rows: CampaignTableRow[];
  /** When true (Meta Ads tab), show Reach and Landing Page Views instead of Clicks and CTR. */
  useMetaReachColumns?: boolean;
  /** Meta ecommerce: Impressions, Reach, LPV, Spend, Purchases, Purchase Value, ROAS. */
  useMetaEcommerceColumns?: boolean;
  /** Google ecommerce: Clicks, Spend, Purchases, Purchase Value, ROAS. */
  useGoogleEcommerceColumns?: boolean;
  /** Meta tab only: per-column visibility from client metrics (omit = legacy Meta layout). */
  columnVisibility?: Record<string, boolean>;
}) {
  const metaEcommerce = useMetaEcommerceColumns;
  const googleEcommerce = useGoogleEcommerceColumns;
  const metaConfigurable = Boolean(useMetaReachColumns && columnVisibility && !metaEcommerce);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
        Campaign breakdown coming soon
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="min-w-[720px] w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-2.5 text-left align-middle">Campaign name</th>
            {metaEcommerce ? (
              <>
                <th className={thMetric}>Impressions</th>
                <th className={thMetric}>Reach</th>
                <th className={thMetric}>Landing Page Views</th>
                <th className={thMetric}>Spend</th>
                <th className={thMetric}>Purchases</th>
                <th className={thMetric}>Purchase Value</th>
                <th className={thMetric}>ROAS</th>
              </>
            ) : googleEcommerce ? (
              <>
                <th className={thMetric}>Clicks</th>
                <th className={thMetric}>Spend</th>
                <th className={thMetric}>Purchases</th>
                <th className={thMetric}>Purchase Value</th>
                <th className={thMetric}>ROAS</th>
              </>
            ) : metaConfigurable ? (
              <>
                {colShown(columnVisibility, "impressions") ? (
                  <th className={thMetric}>Impressions</th>
                ) : null}
                {colShown(columnVisibility, "reach") ? <th className={thMetric}>Reach</th> : null}
                {colShown(columnVisibility, "landing_page_views") ? (
                  <th className={thMetric}>Landing Page Views</th>
                ) : null}
                {colShown(columnVisibility, "clicks") ? <th className={thMetric}>Clicks</th> : null}
                {colShown(columnVisibility, "avgCpc") ? (
                  <th className={thMetric}>Cost per click</th>
                ) : null}
                {colShown(columnVisibility, "spend") ? <th className={thMetric}>Cost</th> : null}
                {colShown(columnVisibility, "conversions") ? (
                  <th className={thMetric}>Conversions</th>
                ) : null}
                {colShown(columnVisibility, "cpl") ? <th className={thMetric}>Cost / conv.</th> : null}
                {colOptIn(columnVisibility, "contact_forms") ? (
                  <th className={thMetric}>Contact Forms</th>
                ) : null}
                {colOptIn(columnVisibility, "purchases") ? (
                  <th className={thMetric}>Purchases</th>
                ) : null}
                {colOptIn(columnVisibility, "purchase_value") ? (
                  <th className={thMetric}>Purchase Value</th>
                ) : null}
                {colOptIn(columnVisibility, "roas") ? <th className={thMetric}>ROAS</th> : null}
              </>
            ) : (
              <>
                <th className={thMetric}>Impressions</th>
                {useMetaReachColumns ? (
                  <>
                    <th className={thMetric}>Reach</th>
                    <th className={thMetric}>Landing Page Views</th>
                  </>
                ) : (
                  <>
                    <th className={thMetric}>Clicks</th>
                    <th className={thMetric}>CTR</th>
                  </>
                )}
                <th className={thMetric}>Cost</th>
                <th className={thMetric}>Conversions</th>
                <th className={thMetric}>Cost / conv.</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ctr = formatPct(r.clicks, r.impressions);
            const costPerConversion = r.conversions > 0 ? r.cost / r.conversions : 0;
            const avgCpc = r.clicks > 0 ? r.cost / r.clicks : 0;
            const reach = r.reach ?? 0;
            const lpv = r.landingPageViews ?? 0;
            return (
              <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                <td
                  className="max-w-[280px] truncate px-3 py-2 text-left font-medium text-zinc-900"
                  title={r.name}
                >
                  {r.name}
                </td>
                {metaEcommerce ? (
                  <>
                    <td className={tdMetric}>{formatWhole(r.impressions)}</td>
                    <td className={tdMetric}>{formatWhole(reach)}</td>
                    <td className={tdMetric}>{formatWhole(lpv)}</td>
                    <td className={tdMetric}>{formatCurrency(r.cost)}</td>
                    <td className={tdMetric}>{formatWhole(r.purchases ?? 0)}</td>
                    <td className={tdMetric}>{formatCurrency(r.purchaseValue ?? 0)}</td>
                    <td className={tdMetric}>{formatRoas(r.roas, r.cost)}</td>
                  </>
                ) : googleEcommerce ? (
                  <>
                    <td className={tdMetric}>{formatWhole(r.clicks)}</td>
                    <td className={tdMetric}>{formatCurrency(r.cost)}</td>
                    <td className={tdMetric}>{formatWhole(r.purchases ?? 0)}</td>
                    <td className={tdMetric}>{formatCurrency(r.purchaseValue ?? 0)}</td>
                    <td className={tdMetric}>{formatRoas(r.roas, r.cost)}</td>
                  </>
                ) : metaConfigurable ? (
                  <>
                    {colShown(columnVisibility, "impressions") ? (
                      <td className={tdMetric}>{formatWhole(r.impressions)}</td>
                    ) : null}
                    {colShown(columnVisibility, "reach") ? (
                      <td className={tdMetric}>{formatWhole(reach)}</td>
                    ) : null}
                    {colShown(columnVisibility, "landing_page_views") ? (
                      <td className={tdMetric}>{formatWhole(lpv)}</td>
                    ) : null}
                    {colShown(columnVisibility, "clicks") ? (
                      <td className={tdMetric}>{formatWhole(r.clicks)}</td>
                    ) : null}
                    {colShown(columnVisibility, "avgCpc") ? (
                      <td className={tdMetric}>{r.clicks > 0 ? formatCurrency(avgCpc) : "—"}</td>
                    ) : null}
                    {colShown(columnVisibility, "spend") ? (
                      <td className={tdMetric}>{formatCurrency(r.cost)}</td>
                    ) : null}
                    {colShown(columnVisibility, "conversions") ? (
                      <td className={tdMetric}>{formatWhole(r.conversions)}</td>
                    ) : null}
                    {colShown(columnVisibility, "cpl") ? (
                      <td className={tdMetric}>
                        {r.conversions > 0 ? formatCurrency(costPerConversion) : "—"}
                      </td>
                    ) : null}
                    {colOptIn(columnVisibility, "contact_forms") ? (
                      <td className={tdMetric}>{formatWhole(r.contactForms ?? 0)}</td>
                    ) : null}
                    {colOptIn(columnVisibility, "purchases") ? (
                      <td className={tdMetric}>{formatWhole(r.purchases ?? 0)}</td>
                    ) : null}
                    {colOptIn(columnVisibility, "purchase_value") ? (
                      <td className={tdMetric}>{formatCurrency(r.purchaseValue ?? 0)}</td>
                    ) : null}
                    {colOptIn(columnVisibility, "roas") ? (
                      <td className={tdMetric}>{formatRoas(r.roas, r.cost)}</td>
                    ) : null}
                  </>
                ) : (
                  <>
                    <td className={tdMetric}>{formatWhole(r.impressions)}</td>
                    {useMetaReachColumns ? (
                      <>
                        <td className={tdMetric}>{formatWhole(reach)}</td>
                        <td className={tdMetric}>{formatWhole(lpv)}</td>
                      </>
                    ) : (
                      <>
                        <td className={tdMetric}>{formatWhole(r.clicks)}</td>
                        <td className={tdMetric}>{ctr}</td>
                      </>
                    )}
                    <td className={tdMetric}>{formatCurrency(r.cost)}</td>
                    <td className={tdMetric}>{formatWhole(r.conversions)}</td>
                    <td className={tdMetric}>
                      {r.conversions > 0 ? formatCurrency(costPerConversion) : "—"}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
