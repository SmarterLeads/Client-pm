import type { DateWindow } from "@/lib/report/client-report-metrics";
import type { KpiStat } from "@/lib/report/client-report-metrics";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type {
  WhatConvertsConfig,
  WhatConvertsLeadTypeCardConfig,
  WhatConvertsReportDisplay,
} from "@/lib/report/whatconverts-config";
import {
  resolveWhatConvertsReportDisplay,
  whatConvertsHeroMetricLabel,
} from "@/lib/report/whatconverts-config";

type SB = SupabaseClient<Database>;

export type WhatConvertsMetrics = {
  uniqueLeads: number;
  formFills: number;
  phoneCalls: number;
  quotable: number;
  salesValue: number;
};

export type WhatConvertsMetricColumn = {
  key: keyof WhatConvertsMetrics;
  label: string;
};

export type WhatConvertsLeadSourceRow = {
  source: string;
  metrics: WhatConvertsMetrics;
};

export type WhatConvertsYtdRow = {
  monthLabel: string;
  monthKey: string;
  isFutureMonth: boolean;
  metrics: WhatConvertsMetrics;
};

export type WhatConvertsLeadTypeCardRow = {
  label: string;
  current: WhatConvertsMetrics;
  prior: WhatConvertsMetrics;
};

export type WhatConvertsReportData = {
  heroKpis: KpiStat[];
  leadSourceRows: WhatConvertsLeadSourceRow[];
  leadTypeCards: WhatConvertsLeadTypeCardRow[];
  ytdCurrentYear: WhatConvertsYtdRow[];
  ytdPriorYear: WhatConvertsYtdRow[];
  currentYear: number;
  priorYear: number;
  display: WhatConvertsReportDisplay;
};

const ALL_METRIC_COLUMNS: WhatConvertsMetricColumn[] = [
  { key: "uniqueLeads", label: "Unique Leads" },
  { key: "formFills", label: "Form Fills" },
  { key: "phoneCalls", label: "Phone Calls" },
  { key: "quotable", label: "Quotable" },
  { key: "salesValue", label: "Sales Value" },
];

export function getVisibleWhatConvertsMetricColumns(
  display: WhatConvertsReportDisplay,
): WhatConvertsMetricColumn[] {
  return ALL_METRIC_COLUMNS.filter((col) => {
    if (col.key === "formFills" && !display.showFormFillsColumn) return false;
    if (col.key === "phoneCalls" && !display.showPhoneCallsColumn) return false;
    if (col.key === "quotable" && display.hideQuotable) return false;
    if (col.key === "salesValue" && display.hideSalesValue) return false;
    return true;
  });
}

type LeadRow = {
  lead_status: string | null;
  quotable: string | null;
  sales_value: number | null;
  lead_source: string | null;
  lead_medium: string | null;
  lead_type: string | null;
  form_name: string | null;
  date_created: string | null;
};

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function emptyMetrics(): WhatConvertsMetrics {
  return { uniqueLeads: 0, formFills: 0, phoneCalls: 0, quotable: 0, salesValue: 0 };
}

function isUniqueLeadStatus(status: string | null | undefined): boolean {
  return (status ?? "").trim() === "Unique";
}

function isQuotableLead(quotable: string | null | undefined): boolean {
  const v = (quotable ?? "").trim().toLowerCase();
  return v === "yes" || v === "quotable" || v === "true";
}

/** Inclusive UTC day bounds for TIMESTAMPTZ comparisons. */
function windowStartIso(startDate: string): string {
  return `${startDate}T00:00:00.000Z`;
}

function windowEndIso(endDate: string): string {
  return `${endDate}T23:59:59.999Z`;
}

function aggregateLeadRows(rows: LeadRow[]): WhatConvertsMetrics {
  const metrics = emptyMetrics();
  for (const row of rows) {
    if (isUniqueLeadStatus(row.lead_status)) {
      metrics.uniqueLeads += 1;
    }
    if (isQuotableLead(row.quotable)) {
      metrics.quotable += 1;
    }
    metrics.salesValue += Number(row.sales_value ?? 0);
    const leadType = normalizeLeadType(row.lead_type);
    if (leadType === "web_form") {
      metrics.formFills += 1;
    }
    if (leadType === "phone_call") {
      metrics.phoneCalls += 1;
    }
  }
  return metrics;
}

function addMetrics(target: WhatConvertsMetrics, add: WhatConvertsMetrics) {
  target.uniqueLeads += add.uniqueLeads;
  target.formFills += add.formFills;
  target.phoneCalls += add.phoneCalls;
  target.quotable += add.quotable;
  target.salesValue += add.salesValue;
}

function resolveLeadSourceMedium(
  sourceRaw: string | null | undefined,
  mediumRaw: string | null | undefined,
): string {
  const source = (sourceRaw ?? "").trim();
  const medium = (mediumRaw ?? "").trim();
  const sourceLabel = source.length > 0 ? source : "direct";
  const mediumLabel = medium.length > 0 ? medium : "none";
  return `${sourceLabel} / ${mediumLabel}`;
}

function normalizeLeadType(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function formNameMatches(
  leadFormName: string | null | undefined,
  configFormName: string | undefined,
): boolean {
  if (!configFormName?.trim()) return true;
  const lead = (leadFormName ?? "").trim().toLowerCase();
  const cfg = configFormName.trim().toLowerCase();
  return lead === cfg || lead.startsWith(`${cfg} `) || lead.startsWith(cfg);
}

function rowMatchesLeadTypeCard(
  row: LeadRow,
  card: WhatConvertsLeadTypeCardConfig,
): boolean {
  if (normalizeLeadType(row.lead_type) !== normalizeLeadType(card.lead_type)) {
    return false;
  }
  if (card.form_name !== undefined) {
    return formNameMatches(row.form_name, card.form_name);
  }
  return true;
}

function aggregateForLeadTypeCard(
  rows: LeadRow[],
  card: WhatConvertsLeadTypeCardConfig,
): WhatConvertsMetrics {
  const matched = rows.filter((row) => rowMatchesLeadTypeCard(row, card));
  return aggregateLeadRows(matched);
}

function countLeadsByType(rows: LeadRow[], leadType: string): number {
  const want = normalizeLeadType(leadType);
  let count = 0;
  for (const row of rows) {
    if (normalizeLeadType(row.lead_type) === want) count += 1;
  }
  return count;
}

type WhatConvertsHeroSnapshot = {
  metrics: WhatConvertsMetrics;
  formFills: number;
  calls: number;
};

function heroSnapshotFromRows(rows: LeadRow[]): WhatConvertsHeroSnapshot {
  return {
    metrics: aggregateLeadRows(rows),
    formFills: countLeadsByType(rows, "web_form"),
    calls: countLeadsByType(rows, "phone_call"),
  };
}

async function fetchLeadRowsInWindow(
  supabase: SB,
  clientId: string,
  startDate: string,
  endDate: string,
  logLabel?: string,
): Promise<LeadRow[]> {
  const startIso = windowStartIso(startDate);
  const endIso = windowEndIso(endDate);

  console.log(`[whatconverts${logLabel ? `/${logLabel}` : ""}] SQL params:`, {
    client_id: clientId,
    start_date: startDate,
    end_date: endDate,
    date_created_gte: startIso,
    date_created_lte: endIso,
  });

  const { count, error: countErr } = await supabase
    .from("whatconverts_leads")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("date_created", startIso)
    .lte("date_created", endIso);
  if (countErr) throw countErr;

  console.log(`[whatconverts${logLabel ? `/${logLabel}` : ""}] raw count:`, count ?? 0);

  const pageSize = 1000;
  let offset = 0;
  const all: LeadRow[] = [];

  for (;;) {
    const { data, error } = await supabase
      .from("whatconverts_leads")
      .select(
        "lead_status, quotable, sales_value, lead_source, lead_medium, lead_type, form_name, date_created",
      )
      .eq("client_id", clientId)
      .gte("date_created", startIso)
      .lte("date_created", endIso)
      .order("date_created", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;

    const batch = (data ?? []) as LeadRow[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

export async function fetchWhatConvertsHeroMetrics(
  supabase: SB,
  clientId: string,
  window: DateWindow,
): Promise<{ current: WhatConvertsHeroSnapshot; prior: WhatConvertsHeroSnapshot }> {
  console.log("[fetchWhatConvertsHeroMetrics] window:", {
    clientId,
    currentStart: window.currentStart,
    currentEnd: window.currentEnd,
    priorStart: window.priorStart,
    priorEnd: window.priorEnd,
  });

  const [currentRows, priorRows] = await Promise.all([
    fetchLeadRowsInWindow(
      supabase,
      clientId,
      window.currentStart,
      window.currentEnd,
      "hero-current",
    ),
    fetchLeadRowsInWindow(
      supabase,
      clientId,
      window.priorStart,
      window.priorEnd,
      "hero-prior",
    ),
  ]);

  console.log("[fetchWhatConvertsHeroMetrics] rows fetched:", {
    currentRowCount: currentRows.length,
    priorRowCount: priorRows.length,
    currentRows,
    priorRows,
  });

  const current = heroSnapshotFromRows(currentRows);
  const prior = heroSnapshotFromRows(priorRows);

  console.log("[fetchWhatConvertsHeroMetrics] computed metrics:", {
    current: {
      uniqueLeads: current.metrics.uniqueLeads,
      quotable: current.metrics.quotable,
      salesValue: current.metrics.salesValue,
      formFills: current.formFills,
      calls: current.calls,
    },
    prior: {
      uniqueLeads: prior.metrics.uniqueLeads,
      quotable: prior.metrics.quotable,
      salesValue: prior.metrics.salesValue,
      formFills: prior.formFills,
      calls: prior.calls,
    },
  });

  return { current, prior };
}

export async function fetchWhatConvertsLeadSourceTable(
  supabase: SB,
  clientId: string,
  window: DateWindow,
): Promise<WhatConvertsLeadSourceRow[]> {
  const rows = await fetchLeadRowsInWindow(
    supabase,
    clientId,
    window.currentStart,
    window.currentEnd,
    "lead-source",
  );
  const bySource = new Map<string, WhatConvertsMetrics>();

  for (const row of rows) {
    const source = resolveLeadSourceMedium(row.lead_source, row.lead_medium);
    const cur = bySource.get(source) ?? emptyMetrics();
    addMetrics(cur, aggregateLeadRows([row]));
    bySource.set(source, cur);
  }

  return Array.from(bySource.entries())
    .sort(([, a], [, b]) => b.uniqueLeads - a.uniqueLeads)
    .map(([source, metrics]) => ({ source, metrics }));
}

export async function fetchWhatConvertsLeadTypeCards(
  supabase: SB,
  clientId: string,
  window: DateWindow,
  config: WhatConvertsConfig | null,
): Promise<WhatConvertsLeadTypeCardRow[]> {
  const cards = config?.lead_type_cards ?? [];
  if (cards.length === 0) return [];

  const [currentRows, priorRows] = await Promise.all([
    fetchLeadRowsInWindow(
      supabase,
      clientId,
      window.currentStart,
      window.currentEnd,
      "lead-type-current",
    ),
    fetchLeadRowsInWindow(
      supabase,
      clientId,
      window.priorStart,
      window.priorEnd,
      "lead-type-prior",
    ),
  ]);

  return cards.map((card) => ({
    label: card.label,
    current: aggregateForLeadTypeCard(currentRows, card),
    prior: aggregateForLeadTypeCard(priorRows, card),
  }));
}

function monthStartIso(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
}

function monthEndIso(year: number, monthIndex: number): string {
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return end.toISOString().slice(0, 10);
}

export async function fetchWhatConvertsYtdRows(
  supabase: SB,
  clientId: string,
  year: number,
  referenceDate = new Date(),
): Promise<WhatConvertsYtdRow[]> {
  const currentYear = referenceDate.getUTCFullYear();
  const currentMonth = referenceDate.getUTCMonth();
  const out: WhatConvertsYtdRow[] = [];

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const isFutureMonth =
      year > currentYear || (year === currentYear && monthIndex > currentMonth);
    const start = monthStartIso(year, monthIndex);
    const end = monthEndIso(year, monthIndex);
    const monthRows = isFutureMonth
      ? []
      : await fetchLeadRowsInWindow(supabase, clientId, start, end, `ytd-${year}-${monthIndex + 1}`);

    out.push({
      monthLabel: MONTH_LABELS[monthIndex],
      monthKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      isFutureMonth,
      metrics: aggregateLeadRows(monthRows),
    });
  }

  return out;
}

function buildHeroKpis(
  current: WhatConvertsHeroSnapshot,
  prior: WhatConvertsHeroSnapshot,
  config: WhatConvertsConfig | null,
): KpiStat[] {
  if (config?.hero_metrics?.length) {
    return config.hero_metrics.map((metric) => {
      switch (metric) {
        case "unique_leads":
          return {
            label: whatConvertsHeroMetricLabel(metric),
            current: current.metrics.uniqueLeads,
            prior: prior.metrics.uniqueLeads,
            format: "number" as const,
          };
        case "form_fills":
          return {
            label: whatConvertsHeroMetricLabel(metric),
            current: current.formFills,
            prior: prior.formFills,
            format: "number" as const,
          };
        case "calls":
          return {
            label: whatConvertsHeroMetricLabel(metric),
            current: current.calls,
            prior: prior.calls,
            format: "number" as const,
          };
        default:
          return {
            label: whatConvertsHeroMetricLabel(metric),
            current: 0,
            prior: 0,
            format: "number" as const,
          };
      }
    });
  }

  const kpis: KpiStat[] = [
    {
      label: "Total Unique Leads",
      current: current.metrics.uniqueLeads,
      prior: prior.metrics.uniqueLeads,
      format: "number",
    },
  ];

  if (config?.hide_quotable !== true) {
    kpis.push({
      label: "Quotable",
      current: current.metrics.quotable,
      prior: prior.metrics.quotable,
      format: "number",
    });
  }

  if (config?.hide_sales_value !== true) {
    kpis.push({
      label: "Sales Value",
      current: current.metrics.salesValue,
      prior: prior.metrics.salesValue,
      format: "currency",
    });
  }

  return kpis;
}

export async function fetchWhatConvertsReportData(
  supabase: SB,
  clientId: string,
  window: DateWindow,
  whatconvertsConfig: WhatConvertsConfig | null = null,
  referenceDate = new Date(),
): Promise<WhatConvertsReportData> {
  const currentYear = referenceDate.getUTCFullYear();
  const priorYear = currentYear - 1;

  const display = resolveWhatConvertsReportDisplay(whatconvertsConfig);

  const hideLeadTypeSection = whatconvertsConfig?.hide_lead_type_section === true;
  const hidePriorYearYtd = whatconvertsConfig?.hide_prior_year_ytd === true;

  const [hero, leadSourceRows, leadTypeCards, ytdCurrentYear, ytdPriorYear] =
    await Promise.all([
      fetchWhatConvertsHeroMetrics(supabase, clientId, window),
      fetchWhatConvertsLeadSourceTable(supabase, clientId, window),
      hideLeadTypeSection
        ? Promise.resolve([])
        : fetchWhatConvertsLeadTypeCards(supabase, clientId, window, whatconvertsConfig),
      fetchWhatConvertsYtdRows(supabase, clientId, currentYear, referenceDate),
      hidePriorYearYtd
        ? Promise.resolve([])
        : fetchWhatConvertsYtdRows(supabase, clientId, priorYear, referenceDate),
    ]);

  return {
    heroKpis: buildHeroKpis(hero.current, hero.prior, whatconvertsConfig),
    leadSourceRows,
    leadTypeCards,
    ytdCurrentYear,
    ytdPriorYear,
    currentYear,
    priorYear,
    display,
  };
}

export function formatWhatConvertsMetricValue(
  key: keyof WhatConvertsMetrics,
  value: number,
): string {
  if (key === "salesValue") {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return Math.round(value).toLocaleString("en-US");
}
