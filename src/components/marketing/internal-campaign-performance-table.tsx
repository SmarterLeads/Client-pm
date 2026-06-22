"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import type {
  InternalCampaignColumnId,
  InternalCampaignVisibleColumn,
} from "@/lib/marketing/report/channel-metric-config";
import type { CampaignTableRow } from "@/lib/marketing/report/report-tab-platform";

type SortKey = "name" | InternalCampaignColumnId;

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatImpressionsK(value: number): string {
  const n = Math.round(value);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString("en-US");
}

function formatWhole(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatPct(num: number, den: number): string {
  if (den <= 0) return "—";
  return `${((num / den) * 100).toFixed(2)}%`;
}

function sortValue(row: CampaignTableRow, key: SortKey): number {
  switch (key) {
    case "name":
      return 0;
    case "impressions":
      return row.impressions;
    case "reach":
      return row.reach ?? 0;
    case "landingPageViews":
      return row.landingPageViews ?? 0;
    case "clicks":
      return row.clicks;
    case "ctr":
      return row.impressions > 0 ? row.clicks / row.impressions : 0;
    case "avgCpc":
      return row.clicks > 0 ? row.cost / row.clicks : 0;
    case "cost":
      return row.cost;
    case "conversions":
      return row.conversions;
    case "cpl":
      return row.conversions > 0 ? row.cost / row.conversions : 0;
    default:
      return 0;
  }
}

function cellValue(row: CampaignTableRow, col: InternalCampaignVisibleColumn): string {
  if (col.kpiOnly) return "—";

  switch (col.columnId) {
    case "impressions":
      return formatImpressionsK(row.impressions);
    case "reach":
      return formatImpressionsK(row.reach ?? 0);
    case "landingPageViews":
      return formatImpressionsK(row.landingPageViews ?? 0);
    case "clicks":
      return formatImpressionsK(row.clicks);
    case "ctr":
      return formatPct(row.clicks, row.impressions);
    case "avgCpc":
      return row.clicks > 0 ? formatCurrency(row.cost / row.clicks) : "—";
    case "cost":
      return formatCurrency(row.cost);
    case "conversions":
      return formatWhole(row.conversions);
    case "cpl":
      return row.conversions > 0 ? formatCurrency(row.cost / row.conversions) : "—";
    default:
      return "—";
  }
}

type Totals = {
  impressions: number;
  reach: number;
  landingPageViews: number;
  clicks: number;
  cost: number;
  conversions: number;
};

function totalValue(totals: Totals, col: InternalCampaignVisibleColumn): string {
  if (col.kpiOnly) return "—";

  switch (col.columnId) {
    case "impressions":
      return formatImpressionsK(totals.impressions);
    case "reach":
      return formatImpressionsK(totals.reach);
    case "landingPageViews":
      return formatImpressionsK(totals.landingPageViews);
    case "clicks":
      return formatImpressionsK(totals.clicks);
    case "ctr":
      return formatPct(totals.clicks, totals.impressions);
    case "avgCpc":
      return totals.clicks > 0 ? formatCurrency(totals.cost / totals.clicks) : "—";
    case "cost":
      return formatCurrency(totals.cost);
    case "conversions":
      return formatWhole(totals.conversions);
    case "cpl":
      return totals.conversions > 0 ? formatCurrency(totals.cost / totals.conversions) : "—";
    default:
      return "—";
  }
}

function defaultSortKey(columns: InternalCampaignVisibleColumn[]): SortKey {
  if (columns.some((c) => c.columnId === "cost")) return "cost";
  return columns[0]?.columnId ?? "name";
}

type Props = {
  rows: CampaignTableRow[];
  columns: InternalCampaignVisibleColumn[];
};

export function InternalCampaignPerformanceTable({ rows, columns }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>(() => defaultSortKey(columns));
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const list = [...rows];
    list.sort((a, b) => {
      if (sortKey === "name") return dir * a.name.localeCompare(b.name);
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (va === vb) return a.name.localeCompare(b.name);
      return dir * (va - vb);
    });
    return list;
  }, [rows, sortDir, sortKey]);

  const totals = useMemo(() => {
    let impressions = 0;
    let reach = 0;
    let landingPageViews = 0;
    let clicks = 0;
    let cost = 0;
    let conversions = 0;
    for (const r of rows) {
      impressions += r.impressions;
      reach += r.reach ?? 0;
      landingPageViews += r.landingPageViews ?? 0;
      clicks += r.clicks;
      cost += r.cost;
      conversions += r.conversions;
    }
    return { impressions, reach, landingPageViews, clicks, cost, conversions };
  }, [rows]);

  const onHeaderClick = (key: SortKey, sortable: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const SortArrow = ({ active, dir }: { active: boolean; dir: "asc" | "desc" }) => {
    if (!active) return null;
    return dir === "asc" ? (
      <ChevronUp className="ml-0.5 inline h-3 w-3 shrink-0 opacity-70" aria-hidden />
    ) : (
      <ChevronDown className="ml-0.5 inline h-3 w-3 shrink-0 opacity-70" aria-hidden />
    );
  };

  const thBase =
    "px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
  const thLeft = `${thBase} text-left`;
  const thRight = `${thBase} text-right`;
  const thBtnLeft = `${thLeft} cursor-pointer select-none hover:text-zinc-800 dark:hover:text-zinc-200`;
  const thBtn = `${thRight} cursor-pointer select-none hover:text-zinc-800 dark:hover:text-zinc-200`;
  const tdName =
    "max-w-[200px] truncate px-2 py-1.5 text-left text-xs font-medium text-zinc-900 dark:text-zinc-50";
  const tdMetric =
    "whitespace-nowrap px-2 py-1.5 text-right text-xs tabular-nums text-zinc-700 dark:text-zinc-300";
  const tdTotal =
    "whitespace-nowrap border-t border-zinc-300 bg-zinc-100 px-2 py-1.5 text-right text-xs font-semibold tabular-nums text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50";

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-4 text-center text-xs text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-400">
        No campaign data — run a sync to populate
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60">
            <th className={thLeft}>
              <button type="button" className={thBtnLeft} onClick={() => onHeaderClick("name", true)}>
                Campaign name
                <SortArrow active={sortKey === "name"} dir={sortDir} />
              </button>
            </th>
            {columns.map((col) => {
              const sortable = !col.kpiOnly;
              const HeaderTag = sortable ? "button" : "span";
              return (
                <th key={col.columnId} className={thRight}>
                  <HeaderTag
                    type={sortable ? "button" : undefined}
                    className={sortable ? thBtn : thRight}
                    onClick={sortable ? () => onHeaderClick(col.columnId, true) : undefined}
                  >
                    {col.label}
                    {sortable ? (
                      <SortArrow active={sortKey === col.columnId} dir={sortDir} />
                    ) : null}
                  </HeaderTag>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r) => (
            <tr key={r.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
              <td className={tdName} title={r.name}>
                {r.name}
              </td>
              {columns.map((col) => (
                <td key={col.columnId} className={tdMetric}>
                  {cellValue(r, col)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className={`${tdName} border-t border-zinc-300 font-semibold dark:border-zinc-600`}>
              Total
            </td>
            {columns.map((col) => (
              <td key={col.columnId} className={tdTotal}>
                {totalValue(totals, col)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
