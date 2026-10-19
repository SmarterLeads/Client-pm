"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InsightsDashboardPayload, Verdict } from "@/lib/ai/insights-dashboard/types";

const DASH_TABS = [
  "Overview",
  "Monthly",
  "Weekly",
  "Search terms",
  "Stop waste",
  "CRM",
  "Platform conv.",
  "Limitations",
] as const;

type DashTab = (typeof DASH_TABS)[number];

function fmtMoney(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "USD" ? "USD" : "CAD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${n.toFixed(0)}`;
  }
}

function verdictVariant(v: Verdict): "default" | "secondary" | "destructive" | "outline" {
  if (v === "Stop") return "destructive";
  if (v === "Keep") return "default";
  if (v === "Optimise") return "secondary";
  return "outline";
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

type AiInsightsDashboardProps = {
  clientId: string;
};

export function AiInsightsDashboard({ clientId }: AiInsightsDashboardProps) {
  const [data, setData] = useState<InsightsDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DashTab>("Overview");
  const [tableHeight, setTableHeight] = useState<"standard" | "tall" | "full">(
    "standard",
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai-weekly-insights/${clientId}/dashboard`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to load dashboard");
      }
      setData((await res.json()) as InsightsDashboardPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const tableMaxH =
    tableHeight === "full"
      ? "max-h-[70vh]"
      : tableHeight === "tall"
        ? "max-h-[480px]"
        : "max-h-[280px]";

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">{error ?? "No dashboard data"}</p>
    );
  }

  const { header } = data;
  const cur = header.currency;

  return (
    <div className="space-y-4">
      <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Synced PM metrics only (subset). For the full SmarterLeads diagnosis
        (change history, ads, landing pages, auction insights, live CRM), use{" "}
        <strong className="font-medium text-foreground">AI reports</strong> →
        generate → copy prompt → run in Claude → save the{" "}
        <a
          href="https://claude.ai/artifact/6tK83g7dEF82g8QGqs9fSa?sk=MOStq7DIWhZNEWBrAgpovw"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Dashboard artifact
        </a>{" "}
        link.
      </p>

      <header className="rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{header.clientName}</h3>
            <p className="text-sm text-muted-foreground">
              {header.industry ?? "Industry not set"} ·{" "}
              {header.dateStart} – {header.dateEnd} · {header.currency}
              {header.googleAdsCustomerId
                ? ` · Google Ads ${header.googleAdsCustomerId}`
                : null}
            </p>
            {header.websiteUrl ? (
              <p className="text-sm text-muted-foreground">{header.websiteUrl}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Table height</span>
            {(["standard", "tall", "full"] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setTableHeight(h)}
                className={cn(
                  "rounded-md px-2 py-1 capitalize",
                  tableHeight === h ? "bg-muted font-medium" : "hover:bg-muted/60",
                )}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed">{header.diagnosis}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {header.partialMonthNote}
        </p>
      </header>

      <nav className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-border bg-background pb-2">
        {DASH_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === t ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Overview" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Spend (last full month)"
              value={fmtMoney(data.overview.lastFullMonth.spend, cur)}
              sub={
                data.overview.spendChangePct != null
                  ? `${data.overview.spendChangePct >= 0 ? "+" : ""}${data.overview.spendChangePct.toFixed(1)}% vs prior month`
                  : undefined
              }
            />
            <KpiCard
              label="Conversions (last full month)"
              value={String(data.overview.lastFullMonth.conversions)}
              sub={
                data.overview.conversionsChangePct != null
                  ? `${data.overview.conversionsChangePct >= 0 ? "+" : ""}${data.overview.conversionsChangePct.toFixed(1)}% vs prior month`
                  : undefined
              }
            />
            <KpiCard
              label="Cost / conv."
              value={
                data.overview.lastFullMonth.cpa != null
                  ? fmtMoney(data.overview.lastFullMonth.cpa, cur)
                  : "—"
              }
            />
            <KpiCard
              label="Conv. rate"
              value={`${data.overview.lastFullMonth.convRate.toFixed(2)}%`}
            />
          </div>
          <MetricsTable
            title="Campaigns (full range)"
            maxH={tableMaxH}
            headers={["Campaign", "Spend", "Clicks", "Conv.", "CPA", "Share"]}
            rows={data.campaigns.map((c) => [
              c.campaignName,
              fmtMoney(c.totals.spend, cur),
              String(c.totals.clicks),
              String(c.totals.conversions),
              c.totals.cpa != null ? fmtMoney(c.totals.cpa, cur) : "—",
              `${c.spendSharePct.toFixed(1)}%`,
            ])}
          />
        </div>
      ) : null}

      {tab === "Monthly" ? (
        <MetricsTable
          title="Account by month"
          maxH={tableMaxH}
          headers={["Month", "Spend", "Clicks", "Impr.", "Conv.", "CPA", "Partial"]}
          rows={data.monthly.map((m) => [
            m.month,
            fmtMoney(m.spend, cur),
            String(m.clicks),
            String(m.impressions),
            String(m.conversions),
            m.cpa != null ? fmtMoney(m.cpa, cur) : "—",
            m.isPartial ? "Yes" : "—",
          ])}
        />
      ) : null}

      {tab === "Weekly" ? (
        <MetricsTable
          title="Account by week (Mon–Sun UTC)"
          maxH={tableMaxH}
          headers={["Week", "Spend", "Clicks", "Conv.", "CPA"]}
          rows={data.weekly.map((w) => [
            `${w.weekStart} – ${w.weekEnd}`,
            fmtMoney(w.spend, cur),
            String(w.clicks),
            String(w.conversions),
            w.cpa != null ? fmtMoney(w.cpa, cur) : "—",
          ])}
        />
      ) : null}

      {tab === "Search terms" ? (
        <MetricsTable
          title="Search terms (≥ $15 spend or ≥ 10 clicks)"
          maxH={tableMaxH}
          headers={["Term", "Campaign", "Spend", "Clicks", "Conv.", "Verdict", "Reason"]}
          rows={data.searchTerms.map((t) => [
            t.searchTerm,
            t.campaignName,
            fmtMoney(t.spend, cur),
            String(t.clicks),
            String(t.conversions),
            t.verdict,
            t.reason,
          ])}
          renderCell={(col, value) =>
            col === 5 ? (
              <Badge variant={verdictVariant(value as Verdict)}>{value}</Badge>
            ) : (
              value
            )
          }
        />
      ) : null}

      {tab === "Stop waste" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Rule-based Stop list from synced search terms. Confirm in Google Ads before negating.
          </p>
          <MetricsTable
            title="Stop candidates"
            maxH={tableMaxH}
            headers={["Type", "Item", "Spend", "Reason"]}
            rows={
              data.stopWaste.length
                ? data.stopWaste.map((s) => [
                    s.type,
                    s.label,
                    fmtMoney(s.spend, cur),
                    s.reason,
                  ])
                : [["—", "No Stop items in range", "", ""]]
            }
          />
        </div>
      ) : null}

      {tab === "CRM" ? (
        data.crm ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pipeline: {data.crm.pipelineName ?? "Lead pipeline"} ·{" "}
              {data.crm.totalLeads} leads · {data.crm.totalWins} wins in range
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <MetricsTable
                title="Leads by month"
                maxH={tableMaxH}
                headers={["Month", "Leads"]}
                rows={data.crm.leadsByMonth.map((r) => [r.month, String(r.count)])}
              />
              <MetricsTable
                title="Wins by month"
                maxH={tableMaxH}
                headers={["Month", "Wins", "Value"]}
                rows={data.crm.winsByMonth.map((r) => [
                  r.month,
                  String(r.count),
                  fmtMoney(r.value, cur),
                ])}
              />
            </div>
            <MetricsTable
              title="Win attribution buckets"
              maxH={tableMaxH}
              headers={["Bucket", "Wins"]}
              rows={data.crm.attributionBuckets.map((b) => [
                b.bucket,
                String(b.wins),
              ])}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No GoHighLevel opportunities synced for this client.
          </p>
        )
      ) : null}

      {tab === "Platform conv." ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Platform conversion events from PM sync — separate from CRM wins.
          </p>
          {data.platformConversionsByMonth.map((m) => (
            <MetricsTable
              key={m.month}
              title={m.month}
              maxH={tableMaxH}
              headers={["Event", "Count"]}
              rows={m.events.map((e) => [e.eventName, String(e.count)])}
            />
          ))}
          {data.platformConversionsByMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversion events in range.</p>
          ) : null}
        </div>
      ) : null}

      {tab === "Limitations" ? (
        <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
          {data.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function MetricsTable({
  title,
  headers,
  rows,
  maxH,
  renderCell,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  maxH: string;
  renderCell?: (colIndex: number, value: string) => ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-3 py-2 text-sm font-medium">
        {title}
      </div>
      <div className={cn("overflow-auto", maxH)}>
        <table className="w-full min-w-[480px] text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left font-medium last:text-right [&:not(:first-child)]:text-right"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-border/60 hover:bg-muted/30">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      "px-3 py-2 align-top",
                      j === 0 ? "text-left" : "text-right tabular-nums",
                    )}
                  >
                    {renderCell ? renderCell(j, cell) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
