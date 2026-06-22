import type { Json } from "@/lib/types/database";

export type WhatConvertsLeadTypeCardConfig = {
  label: string;
  lead_type: string;
  form_name?: string;
};

export const WHATCONVERTS_HERO_METRICS = ["unique_leads", "form_fills", "calls"] as const;

export type WhatConvertsHeroMetric = (typeof WHATCONVERTS_HERO_METRICS)[number];

export type WhatConvertsConfig = {
  lead_type_cards?: WhatConvertsLeadTypeCardConfig[];
  hide_quotable?: boolean;
  hide_sales_value?: boolean;
  hide_lead_type_section?: boolean;
  hide_prior_year_ytd?: boolean;
  hero_metrics?: WhatConvertsHeroMetric[];
};

export type WhatConvertsReportDisplay = {
  hideQuotable: boolean;
  hideSalesValue: boolean;
  hideLeadTypeSection: boolean;
  hidePriorYearYtd: boolean;
  showFormFillsColumn: boolean;
  showPhoneCallsColumn: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function parseLeadTypeCard(raw: unknown): WhatConvertsLeadTypeCardConfig | null {
  if (!isRecord(raw)) return null;
  const label = readString(raw, "label");
  const lead_type = readString(raw, "lead_type");
  if (!label || !lead_type) return null;
  const form_name = readString(raw, "form_name") ?? undefined;
  return { label, lead_type, form_name };
}

function parseHeroMetric(raw: unknown): WhatConvertsHeroMetric | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim() as WhatConvertsHeroMetric;
  return (WHATCONVERTS_HERO_METRICS as readonly string[]).includes(key) ? key : null;
}

/** Parse `clients.whatconverts_config` jsonb. Returns null when empty or invalid. */
export function parseWhatConvertsConfig(
  raw: Json | unknown | null | undefined,
): WhatConvertsConfig | null {
  if (raw == null) return null;
  let obj: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecord(parsed)) return null;
      obj = parsed;
    } catch {
      return null;
    }
  } else if (isRecord(raw)) {
    obj = raw;
  } else {
    return null;
  }

  const config: WhatConvertsConfig = {};

  const cardsRaw = obj.lead_type_cards;
  if (Array.isArray(cardsRaw) && cardsRaw.length > 0) {
    const lead_type_cards: WhatConvertsLeadTypeCardConfig[] = [];
    for (const item of cardsRaw) {
      const card = parseLeadTypeCard(item);
      if (card) lead_type_cards.push(card);
    }
    if (lead_type_cards.length > 0) config.lead_type_cards = lead_type_cards;
  }

  if (obj.hide_quotable === true) config.hide_quotable = true;
  if (obj.hide_sales_value === true) config.hide_sales_value = true;
  if (obj.hide_lead_type_section === true) config.hide_lead_type_section = true;
  if (obj.hide_prior_year_ytd === true) config.hide_prior_year_ytd = true;

  const heroRaw = obj.hero_metrics;
  if (Array.isArray(heroRaw) && heroRaw.length > 0) {
    const hero_metrics: WhatConvertsHeroMetric[] = [];
    for (const item of heroRaw) {
      const metric = parseHeroMetric(item);
      if (metric) hero_metrics.push(metric);
    }
    if (hero_metrics.length > 0) config.hero_metrics = hero_metrics;
  }

  if (Object.keys(config).length === 0) return null;
  return config;
}

export function resolveWhatConvertsReportDisplay(
  config: WhatConvertsConfig | null | undefined,
): WhatConvertsReportDisplay {
  const heroMetrics = config?.hero_metrics ?? [];
  return {
    hideQuotable: config?.hide_quotable === true,
    hideSalesValue: config?.hide_sales_value === true,
    hideLeadTypeSection: config?.hide_lead_type_section === true,
    hidePriorYearYtd: config?.hide_prior_year_ytd === true,
    showFormFillsColumn: heroMetrics.includes("form_fills"),
    showPhoneCallsColumn: heroMetrics.includes("calls"),
  };
}

export function whatConvertsHeroMetricLabel(metric: WhatConvertsHeroMetric): string {
  switch (metric) {
    case "unique_leads":
      return "Total Unique Leads";
    case "form_fills":
      return "Form Fills";
    case "calls":
      return "Calls";
    default:
      return metric;
  }
}
