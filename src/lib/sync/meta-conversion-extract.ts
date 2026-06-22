/**
 * Extract Meta Ads Insights `actions[]` / `action_values[]` entries used for conversion totals,
 * monetary values, and `conversion_events`.
 * Counts/currency amounts use Meta’s `value` on each row by default (aligned with requested `action_attribution_windows`).
 * Clients with `clients.meta_attribution_window = '7d_click'` use the `7d_click` field only (no fallback to `value`).
 */

/** Canonical purchase bucket for standard Meta `purchase` insights rows. */
export const META_CANONICAL_PURCHASE_ACTION_KEY = "purchase" as const;

const STANDARD_PURCHASE_ACTION_TYPES = new Set(["purchase"]);

/** Standard Meta funnel events extracted for ecommerce clients. */
export const META_ECOMMERCE_FUNNEL_ACTION_TYPES = new Set([
  "add_to_cart",
  "initiate_checkout",
  "add_payment_info",
]);

/** How to read counts/values from each Insights action row. */
export type MetaAttributionWindowMode = "value" | "7d_click_only";

export type MetaConversionExtractOptions = {
  /** When true, also track standard ecommerce funnel action types. */
  includeEcommerceFunnel?: boolean;
  /** Per-client attribution window for conversion/purchase action arrays. */
  attributionWindow?: MetaAttributionWindowMode;
};

export function metaAttributionWindowModeFromClientSetting(
  raw: string | null | undefined,
): MetaAttributionWindowMode {
  return raw?.trim() === "7d_click" ? "7d_click_only" : "value";
}

/**
 * Map Meta `action_type` to a deduped aggregation key for conversion counts/values.
 * Standard `purchase` rows → {@link META_CANONICAL_PURCHASE_ACTION_KEY}.
 * Pixel custom + `offsite_conversion.custom.*` keep their Meta strings.
 * Ecommerce funnel rows (`add_to_cart`, etc.) keep their Meta strings when enabled.
 */
export function canonicalMetaConversionActionKey(
  rawActionType: string,
  opts?: MetaConversionExtractOptions,
): string | null {
  const t = rawActionType.trim();
  if (!t) return null;
  if (STANDARD_PURCHASE_ACTION_TYPES.has(t)) return META_CANONICAL_PURCHASE_ACTION_KEY;
  if (opts?.includeEcommerceFunnel && META_ECOMMERCE_FUNNEL_ACTION_TYPES.has(t)) return t;
  if (t === "offsite_conversion.fb_pixel_custom") return t;
  if (t.startsWith("offsite_conversion.custom.")) return t;
  return null;
}

/** True for tracked conversion action types (custom + standard purchases [+ ecommerce funnel]). */
export function isMetaAttributionConversionActionType(
  actionType: string,
  opts?: MetaConversionExtractOptions,
): boolean {
  return canonicalMetaConversionActionKey(actionType.trim(), opts) !== null;
}

/**
 * Aggregation key for any insight `actions` / `action_values` row — canonical for conversions/purchases, else trim.
 */
export function metaInsightsActionAggregationKey(rawActionType: string): string {
  const t = rawActionType.trim();
  const canon = canonicalMetaConversionActionKey(t);
  return canon ?? t;
}

function parseNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function metaActionMetricFromInsightAction(
  action: unknown,
  field: "value" | "7d_click",
): number {
  if (!action || typeof action !== "object" || Array.isArray(action)) return 0;
  const o = action as Record<string, unknown>;
  return parseNum(o[field]);
}

/** Rounded whole count from an Insights `actions` row. */
export function metaActionCount7dClickOrValue(
  action: unknown,
  opts?: MetaConversionExtractOptions,
): number {
  const field = opts?.attributionWindow === "7d_click_only" ? "7d_click" : "value";
  return Math.round(metaActionMetricFromInsightAction(action, field));
}

/** Monetary amount from an Insights `action_values` row (account currency). */
export function metaActionValue7dClickOrValue(
  action: unknown,
  opts?: MetaConversionExtractOptions,
): number {
  const field = opts?.attributionWindow === "7d_click_only" ? "7d_click" : "value";
  return metaActionMetricFromInsightAction(action, field);
}

/** Sum monetary values per aggregation key (`purchase` for standard purchase action_type). */
export function sumMetaActionTypeValues(
  actionArrays: unknown[][],
  opts?: MetaConversionExtractOptions,
): Map<string, number> {
  const byType = new Map<string, number>();
  for (const arr of actionArrays) {
    for (const a of arr) {
      if (!a || typeof a !== "object" || Array.isArray(a)) continue;
      const o = a as Record<string, unknown>;
      const at = String(o.action_type ?? "").trim();
      if (!at) continue;
      const aggKey = metaInsightsActionAggregationKey(at);
      const v = metaActionValue7dClickOrValue(o, opts);
      if (!(v > 0)) continue;
      byType.set(aggKey, (byType.get(aggKey) ?? 0) + v);
    }
  }
  return byType;
}

/** Collect `actions` arrays from `raw` shapes written by Meta sync (nested or flat). */
export function extractActionsArraysFromMetaRaw(raw: unknown): unknown[][] {
  const out: unknown[][] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;

  const pushRow = (node: unknown) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    const o = node as Record<string, unknown>;
    if (Array.isArray(o.actions)) out.push(o.actions as unknown[]);
  };

  pushRow(raw);

  const insights = r.insights;
  if (insights && typeof insights === "object" && !Array.isArray(insights)) {
    const ins = insights as Record<string, unknown>;
    for (const key of ["core_rows", "action_breakdown_rows"] as const) {
      const rows = ins[key];
      if (Array.isArray(rows)) {
        for (const row of rows) pushRow(row);
      }
    }
  }
  return out;
}

/**
 * Aggregate counts keyed by full `action_type` string.
 *
 * Some Meta payloads can include duplicate rows/arrays for the same day; summing every
 * occurrence can double-count. We keep the maximum observed count per action_type.
 */
export function aggregateMetaCustomConversionsFromActionsArrays(
  actionArrays: unknown[][],
  opts?: MetaConversionExtractOptions,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const arr of actionArrays) {
    for (const a of arr) {
      if (!a || typeof a !== "object" || Array.isArray(a)) continue;
      const o = a as Record<string, unknown>;
      const at = String(o.action_type ?? "").trim();
      const canon = canonicalMetaConversionActionKey(at, opts);
      if (!canon) continue;
      const n = metaActionCount7dClickOrValue(o, opts);
      if (n <= 0) continue;
      totals.set(canon, Math.max(totals.get(canon) ?? 0, n));
    }
  }
  return totals;
}

/** Sum conversion counts for `daily_performance.conversions` — excludes ecommerce funnel steps. */
export function sumMetaDailyPerformanceConversions(convMap: Map<string, number>): number {
  let s = 0;
  for (const [key, value] of Array.from(convMap.entries())) {
    if (META_ECOMMERCE_FUNNEL_ACTION_TYPES.has(key)) continue;
    s += value;
  }
  return s;
}

export function sumMapValues(m: Map<string, number>): number {
  let s = 0;
  for (const v of Array.from(m.values())) s += v;
  return s;
}
