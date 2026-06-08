"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import type {
  GoogleAdsCampaignTableState,
  GoogleCampaignPerfRow,
  ReportCampaignTablePlatform,
} from "@/lib/report/google-ads-campaign-report";

function formatMoney(value: number, min = 2, max = 2): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

function formatSpend(value: number): string {
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

type SortKey =
  | "name"
  | "impressions"
  | "clicks"
  | "ctr"
  | "avgCpc"
  | "spend"
  | "conversions"
  | "cpl"
  | `conv:${string}`;

type Props = {
  primaryColor: string;
  clientId: string;
  canRunCampaignSync: boolean;
  state: GoogleAdsCampaignTableState;
  /** Which ad platform data to show (drives columns and sync endpoint). */
  platform?: ReportCampaignTablePlatform;
  /** Per-column visibility (`conv:{id}` for Google conversion columns). Omitted = all visible. */
  columnVisibility?: Record<string, boolean>;
};

function colShown(v: Record<string, boolean> | undefined, key: string): boolean {
  if (!v) return true;
  return v[key] !== false;
}

function cplValue(r: GoogleCampaignPerfRow): number {
  return r.totalConversions > 0 ? r.spend / r.totalConversions : 0;
}

function convValue(r: GoogleCampaignPerfRow, bucketKey: string): number {
  return r.conversionByBucketKey[bucketKey] ?? 0;
}

function ctrFraction(r: GoogleCampaignPerfRow): number {
  return r.impressions > 0 ? r.clicks / r.impressions : 0;
}

function ctrPercentDisplay(r: GoogleCampaignPerfRow): string {
  return `${(ctrFraction(r) * 100).toFixed(2)}%`;
}

function avgCpcValue(r: GoogleCampaignPerfRow): number {
  return r.clicks > 0 ? r.spend / r.clicks : 0;
}

function formatMicrosoftConversions(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-9) return formatWhole(n);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "Free Assessment(s)" → second line after leading "Free " (case-insensitive). */
function freeAssessmentSecondLine(displayLabel: string): string | null {
  const t = displayLabel.trim();
  const lower = t.toLowerCase();
  if (!lower.startsWith("free ") || !/\bassessment(s)?\b/.test(lower)) return null;
  const prefix = /^free\s+/i.exec(t);
  if (!prefix) return null;
  const rest = t.slice(prefix[0].length).trim();
  return rest.length > 0 ? rest : null;
}

const thMetricMultiLine =
  "px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-white whitespace-normal leading-tight";

export function GoogleAdsCampaignPerformanceTable({
  primaryColor,
  clientId,
  canRunCampaignSync,
  state,
  platform = "google",
  columnVisibility: columnVisibilityProp,
}: Props) {
  const router = useRouter();
  const isMicrosoft = platform === "microsoft";
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [syncing, setSyncing] = useState(false);

  const { conversionColumns, rows, dataUnavailable } = state;
  const v = columnVisibilityProp;

  const visibleConvCols = useMemo(
    () =>
      isMicrosoft
        ? conversionColumns
        : conversionColumns.filter((col) => colShown(v, `conv:${col.id}`)),
    [conversionColumns, isMicrosoft, v],
  );

  const sortKeyActive = useMemo((): SortKey => {
    if (sortKey === "name") return "name";
    const msKeys: SortKey[] = ["impressions", "clicks", "ctr", "avgCpc", "spend", "conversions", "cpl"];
    if (isMicrosoft) {
      if (msKeys.includes(sortKey as SortKey) && colShown(v, sortKey)) return sortKey;
      return "spend";
    }
    if (sortKey.startsWith("conv:")) {
      return colShown(v, sortKey) ? sortKey : "spend";
    }
    const gKeys = ["impressions", "clicks", "ctr", "avgCpc", "spend", "conversions", "cpl"] as const;
    if (gKeys.includes(sortKey as (typeof gKeys)[number]) && colShown(v, sortKey)) return sortKey;
    return "spend";
  }, [isMicrosoft, sortKey, v]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const list = [...rows];
    const key = sortKeyActive;
    list.sort((a, b) => {
      let va = 0;
      let vb = 0;
      if (key === "name") {
        return dir * a.name.localeCompare(b.name);
      }
      if (key === "impressions") {
        va = a.impressions;
        vb = b.impressions;
      } else if (key === "clicks") {
        va = a.clicks;
        vb = b.clicks;
      } else if (key === "ctr") {
        va = ctrFraction(a);
        vb = ctrFraction(b);
      } else if (key === "avgCpc") {
        va = avgCpcValue(a);
        vb = avgCpcValue(b);
      } else if (key === "spend") {
        va = a.spend;
        vb = b.spend;
      } else if (key === "conversions") {
        va = a.totalConversions;
        vb = b.totalConversions;
      } else if (key === "cpl") {
        va = cplValue(a);
        vb = cplValue(b);
      } else if (key.startsWith("conv:")) {
        const bucketKey = key.slice("conv:".length);
        va = convValue(a, bucketKey);
        vb = convValue(b, bucketKey);
      }
      if (va === vb) return a.name.localeCompare(b.name);
      return dir * (va - vb);
    });
    return list;
  }, [rows, sortKeyActive, sortDir]);

  const totals = useMemo(() => {
    let impressions = 0;
    let clicks = 0;
    let spend = 0;
    let totalConversions = 0;
    const convSums: Record<string, number> = {};
    const colsForTotals = isMicrosoft ? conversionColumns : visibleConvCols;
    for (const r of rows) {
      impressions += r.impressions;
      clicks += r.clicks;
      spend += r.spend;
      totalConversions += r.totalConversions;
      for (const col of colsForTotals) {
        convSums[col.id] = (convSums[col.id] ?? 0) + convValue(r, col.id);
      }
    }
    return { impressions, clicks, spend, totalConversions, convSums };
  }, [rows, conversionColumns, isMicrosoft, visibleConvCols]);

  const onHeaderClick = (key: SortKey) => {
    if (sortKeyActive === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const metricColCount = useMemo(() => {
    if (isMicrosoft) {
      const keys = ["impressions", "clicks", "ctr", "avgCpc", "spend", "conversions", "cpl"] as const;
      return Math.max(1, keys.filter((k) => colShown(v, k)).length);
    }
    let n = 0;
    for (const k of ["impressions", "clicks", "ctr", "avgCpc", "spend", "conversions"] as const) {
      if (colShown(v, k)) n += 1;
    }
    n += visibleConvCols.length;
    if (colShown(v, "cpl")) n += 1;
    return Math.max(1, n);
  }, [isMicrosoft, v, visibleConvCols.length]);

  const SortArrow = ({ active, dir }: { active: boolean; dir: "asc" | "desc" }) => {
    if (!active) return <span className="inline-block w-3 shrink-0 opacity-0" aria-hidden />;
    return dir === "asc" ? (
      <ChevronUp className="inline h-3 w-3 shrink-0 opacity-90" aria-hidden />
    ) : (
      <ChevronDown className="inline h-3 w-3 shrink-0 opacity-90" aria-hidden />
    );
  };

  const metricColWidthPct = 75 / metricColCount;

  const thName =
    "w-[25%] px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap";
  const thMetric =
    "px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap";
  const tdName =
    "w-[25%] max-w-0 px-2 py-2 text-left text-xs font-medium text-zinc-900 overflow-hidden text-ellipsis whitespace-nowrap";
  const tdMetric = "px-2 py-2 text-center text-xs tabular-nums text-zinc-800";
  const tdTotalMetric =
    "px-2 py-2 text-center text-xs font-bold tabular-nums text-zinc-900 border-t-2 border-zinc-300 bg-zinc-200";
  const tdTotalName =
    "w-[25%] max-w-0 px-2 py-2 text-left text-xs font-bold text-zinc-900 border-t-2 border-zinc-300 bg-zinc-200 overflow-hidden text-ellipsis whitespace-nowrap";

  const syncPath = platform === "microsoft" ? "/api/sync/microsoft-ads" : "/api/sync/google-ads";

  const onRunSync = async () => {
    if (!canRunCampaignSync || syncing) return;
    setSyncing(true);
    try {
      const res = await fetch(syncPath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `Sync failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (dataUnavailable || rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
        <p className="mb-4">Campaign data not available — run a sync to populate</p>
        <button
          type="button"
          disabled={!canRunCampaignSync || syncing}
          onClick={onRunSync}
          className="inline-flex items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-semibold shadow-sm transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {syncing ? "Running sync…" : "Run campaign sync"}
        </button>
        {!canRunCampaignSync ? (
          <p className="mt-3 text-xs text-zinc-500">Sign in as agency staff to run sync from this report.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 shadow-sm">
      <div className="max-h-[min(70vh,720px)] overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed border-collapse text-xs">
          <colgroup>
            <col style={{ width: "25%" }} />
            {Array.from({ length: metricColCount }, (_, i) => (
              <col key={i} style={{ width: `${metricColWidthPct}%` }} />
            ))}
          </colgroup>
          <thead
            className="sticky top-0 z-20 shadow-sm"
            style={{ backgroundColor: primaryColor, color: "#fff" }}
          >
            {isMicrosoft ? (
              <tr>
                <th className={`${thName} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                  <button
                    type="button"
                    className="inline-flex max-w-full items-center gap-1 hover:underline"
                    onClick={() => onHeaderClick("name")}
                  >
                    <span className="truncate">Campaign Name</span>
                    <SortArrow active={sortKeyActive === "name"} dir={sortDir} />
                  </button>
                </th>
                {colShown(v, "impressions") ? (
                  <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("impressions")}
                    >
                      Impressions
                      <SortArrow active={sortKeyActive === "impressions"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
                {colShown(v, "clicks") ? (
                  <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("clicks")}
                    >
                      Clicks
                      <SortArrow active={sortKeyActive === "clicks"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
                {colShown(v, "ctr") ? (
                  <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("ctr")}
                    >
                      CTR
                      <SortArrow active={sortKeyActive === "ctr"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
                {colShown(v, "avgCpc") ? (
                  <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("avgCpc")}
                    >
                      Avg CPC
                      <SortArrow active={sortKeyActive === "avgCpc"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
                {colShown(v, "spend") ? (
                  <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("spend")}
                    >
                      Spend
                      <SortArrow active={sortKeyActive === "spend"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
                {colShown(v, "conversions") ? (
                  <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("conversions")}
                    >
                      Conversions
                      <SortArrow active={sortKeyActive === "conversions"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
                {colShown(v, "cpl") ? (
                  <th className={`${thMetricMultiLine} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full min-w-0 items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("cpl")}
                    >
                      <span className="inline-block max-w-full text-center leading-tight">
                        Cost per
                        <br />
                        Lead
                      </span>
                      <SortArrow active={sortKeyActive === "cpl"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
              </tr>
            ) : (
              <tr>
                <th className={`${thName} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                  <button
                    type="button"
                    className="inline-flex max-w-full items-center gap-1 hover:underline"
                    onClick={() => onHeaderClick("name")}
                  >
                    <span className="truncate">Campaign Name</span>
                    <SortArrow active={sortKeyActive === "name"} dir={sortDir} />
                  </button>
                </th>
                {colShown(v, "impressions") ? (
                  <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("impressions")}
                    >
                      Impressions
                      <SortArrow active={sortKeyActive === "impressions"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
                {colShown(v, "clicks") ? (
                  <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("clicks")}
                    >
                      Clicks
                      <SortArrow active={sortKeyActive === "clicks"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
                {colShown(v, "ctr") ? (
                  <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("ctr")}
                    >
                      CTR
                      <SortArrow active={sortKeyActive === "ctr"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
                {colShown(v, "avgCpc") ? (
                  <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("avgCpc")}
                    >
                      Avg CPC
                      <SortArrow active={sortKeyActive === "avgCpc"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
                {colShown(v, "spend") ? (
                  <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("spend")}
                    >
                      Spend
                      <SortArrow active={sortKeyActive === "spend"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
                {colShown(v, "conversions") ? (
                  <th className={`${thMetric} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("conversions")}
                    >
                      Conversions
                      <SortArrow active={sortKeyActive === "conversions"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
                {visibleConvCols.map((col) => {
                  const faLine2 = freeAssessmentSecondLine(col.displayLabel);
                  const thClass = faLine2 != null ? thMetricMultiLine : thMetric;
                  return (
                    <th
                      key={col.id}
                      className={`${thClass} border-b border-white/20`}
                      style={{ backgroundColor: primaryColor }}
                      title={col.displayLabel}
                    >
                      <button
                        type="button"
                        className="inline-flex w-full min-w-0 items-center justify-center gap-1 hover:underline"
                        onClick={() => onHeaderClick(`conv:${col.id}` as SortKey)}
                      >
                        {faLine2 != null ? (
                          <span className="inline-block max-w-full text-center leading-tight">
                            Free
                            <br />
                            {faLine2}
                          </span>
                        ) : (
                          <span className="truncate">{col.displayLabel}</span>
                        )}
                        <SortArrow active={sortKeyActive === `conv:${col.id}`} dir={sortDir} />
                      </button>
                    </th>
                  );
                })}
                {colShown(v, "cpl") ? (
                  <th className={`${thMetricMultiLine} border-b border-white/20`} style={{ backgroundColor: primaryColor }}>
                    <button
                      type="button"
                      className="inline-flex w-full min-w-0 items-center justify-center gap-1 hover:underline"
                      onClick={() => onHeaderClick("cpl")}
                    >
                      <span className="inline-block max-w-full text-center leading-tight">
                        Cost per
                        <br />
                        Lead
                      </span>
                      <SortArrow active={sortKeyActive === "cpl"} dir={sortDir} />
                    </button>
                  </th>
                ) : null}
              </tr>
            )}
          </thead>
          <tbody>
            {isMicrosoft
              ? sortedRows.map((r, idx) => {
                  const bg = idx % 2 === 0 ? "bg-white" : "bg-zinc-50";
                  return (
                    <tr key={r.campaignId} className={`border-b border-zinc-100 ${bg}`}>
                      <td className={`${tdName} ${bg}`} title={r.name}>
                        {r.name}
                      </td>
                      {colShown(v, "impressions") ? (
                        <td className={`${tdMetric} ${bg}`}>{formatWhole(r.impressions)}</td>
                      ) : null}
                      {colShown(v, "clicks") ? (
                        <td className={`${tdMetric} ${bg}`}>{formatWhole(r.clicks)}</td>
                      ) : null}
                      {colShown(v, "ctr") ? (
                        <td className={`${tdMetric} ${bg}`}>{ctrPercentDisplay(r)}</td>
                      ) : null}
                      {colShown(v, "avgCpc") ? (
                        <td className={`${tdMetric} ${bg}`}>
                          {r.clicks > 0 ? formatMoney(avgCpcValue(r)) : "—"}
                        </td>
                      ) : null}
                      {colShown(v, "spend") ? (
                        <td className={`${tdMetric} ${bg}`}>{formatSpend(r.spend)}</td>
                      ) : null}
                      {colShown(v, "conversions") ? (
                        <td className={`${tdMetric} ${bg}`}>{formatMicrosoftConversions(r.totalConversions)}</td>
                      ) : null}
                      {colShown(v, "cpl") ? (
                        <td className={`${tdMetric} ${bg}`}>
                          {r.totalConversions > 0 ? formatMoney(cplValue(r)) : "—"}
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              : sortedRows.map((r, idx) => {
                  const bg = idx % 2 === 0 ? "bg-white" : "bg-zinc-50";
                  return (
                    <tr key={r.campaignId} className={`border-b border-zinc-100 ${bg}`}>
                      <td className={`${tdName} ${bg}`} title={r.name}>
                        {r.name}
                      </td>
                      {colShown(v, "impressions") ? (
                        <td className={`${tdMetric} ${bg}`}>{formatWhole(r.impressions)}</td>
                      ) : null}
                      {colShown(v, "clicks") ? (
                        <td className={`${tdMetric} ${bg}`}>{formatWhole(r.clicks)}</td>
                      ) : null}
                      {colShown(v, "ctr") ? (
                        <td className={`${tdMetric} ${bg}`}>{ctrPercentDisplay(r)}</td>
                      ) : null}
                      {colShown(v, "avgCpc") ? (
                        <td className={`${tdMetric} ${bg}`}>
                          {r.clicks > 0 ? formatMoney(avgCpcValue(r)) : "—"}
                        </td>
                      ) : null}
                      {colShown(v, "spend") ? (
                        <td className={`${tdMetric} ${bg}`}>{formatSpend(r.spend)}</td>
                      ) : null}
                      {colShown(v, "conversions") ? (
                        <td className={`${tdMetric} ${bg}`}>{formatWhole(r.totalConversions)}</td>
                      ) : null}
                      {visibleConvCols.map((col) => (
                        <td key={col.id} className={`${tdMetric} ${bg}`}>
                          {formatWhole(convValue(r, col.id))}
                        </td>
                      ))}
                      {colShown(v, "cpl") ? (
                        <td className={`${tdMetric} ${bg}`}>
                          {r.totalConversions > 0 ? formatMoney(cplValue(r)) : "—"}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
            {isMicrosoft ? (
              <tr>
                <td className={tdTotalName} title="Total">
                  Total
                </td>
                {colShown(v, "impressions") ? (
                  <td className={tdTotalMetric}>{formatWhole(totals.impressions)}</td>
                ) : null}
                {colShown(v, "clicks") ? (
                  <td className={tdTotalMetric}>{formatWhole(totals.clicks)}</td>
                ) : null}
                {colShown(v, "ctr") ? (
                  <td className={tdTotalMetric}>
                    {totals.impressions > 0
                      ? `${((totals.clicks / totals.impressions) * 100).toFixed(2)}%`
                      : "0.00%"}
                  </td>
                ) : null}
                {colShown(v, "avgCpc") ? (
                  <td className={tdTotalMetric}>
                    {totals.clicks > 0 ? formatMoney(totals.spend / totals.clicks) : "—"}
                  </td>
                ) : null}
                {colShown(v, "spend") ? (
                  <td className={tdTotalMetric}>{formatSpend(totals.spend)}</td>
                ) : null}
                {colShown(v, "conversions") ? (
                  <td className={tdTotalMetric}>{formatMicrosoftConversions(totals.totalConversions)}</td>
                ) : null}
                {colShown(v, "cpl") ? (
                  <td className={tdTotalMetric}>
                    {totals.totalConversions > 0 ? formatMoney(totals.spend / totals.totalConversions) : "—"}
                  </td>
                ) : null}
              </tr>
            ) : (
              <tr>
                <td className={tdTotalName} title="Total">
                  Total
                </td>
                {colShown(v, "impressions") ? (
                  <td className={tdTotalMetric}>{formatWhole(totals.impressions)}</td>
                ) : null}
                {colShown(v, "clicks") ? (
                  <td className={tdTotalMetric}>{formatWhole(totals.clicks)}</td>
                ) : null}
                {colShown(v, "ctr") ? (
                  <td className={tdTotalMetric}>
                    {totals.impressions > 0
                      ? `${((totals.clicks / totals.impressions) * 100).toFixed(2)}%`
                      : "0.00%"}
                  </td>
                ) : null}
                {colShown(v, "avgCpc") ? (
                  <td className={tdTotalMetric}>
                    {totals.clicks > 0 ? formatMoney(totals.spend / totals.clicks) : "—"}
                  </td>
                ) : null}
                {colShown(v, "spend") ? (
                  <td className={tdTotalMetric}>{formatSpend(totals.spend)}</td>
                ) : null}
                {colShown(v, "conversions") ? (
                  <td className={tdTotalMetric}>{formatWhole(totals.totalConversions)}</td>
                ) : null}
                {visibleConvCols.map((col) => (
                  <td key={col.id} className={tdTotalMetric}>
                    {formatWhole(totals.convSums[col.id] ?? 0)}
                  </td>
                ))}
                {colShown(v, "cpl") ? (
                  <td className={tdTotalMetric}>
                    {totals.totalConversions > 0 ? formatMoney(totals.spend / totals.totalConversions) : "—"}
                  </td>
                ) : null}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
