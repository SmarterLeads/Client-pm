export type ConversionType =
  | "lead"
  | "opportunity"
  | "purchase"
  | "custom"
  | "other";

export type KpiDatum = {
  label: string;
  value: number;
  metricType?: "number" | "percent" | "currency";
  /** When set, use instead of formatting `value` (e.g. "—" for N/A) */
  displayValue?: string;
  delta?: string;
  deltaPositive?: boolean;
  /** When true, a decrease vs prior period is favorable (green). */
  lowerIsBetter?: boolean;
};

export type ConversionBreakdownGroup = {
  groupName: string;
  groupOrder: number;
  rows: {
    id: string;
    displayName: string;
    type: ConversionType;
    sortOrder: number;
    totalCount: number;
    priorCount: number;
    wowPct: number;
    costPerConv: number;
  }[];
};

export type PrimaryMetric = {
  id: string;
  label: string;
  value: number;
  wowPct: number;
  priorValue: number;
  /** currency = USD, ratio = multiplier (e.g. ROAS "2.30x"), default integer count */
  valueKind?: "count" | "currency" | "ratio";
};

export function normalizeConversionType(raw: string | null | undefined): ConversionType {
  const v = (raw ?? "custom").toLowerCase();
  if (v === "lead") return "lead";
  if (v === "opportunity") return "opportunity";
  if (v === "purchase") return "purchase";
  if (v === "other") return "other";
  return "custom";
}
