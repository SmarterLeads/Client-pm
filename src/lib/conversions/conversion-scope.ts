import {
  activeConversionPairKey,
  type ActiveConversionPairIndex,
} from "@/lib/report/report-tab-platform";

export type ClientConversionScopeRow = {
  raw_name: string;
  platform?: string;
  display_name?: string | null;
  mapped_name?: string | null;
  is_active?: boolean | null;
};

/** Case-insensitive key for grouping conversions by display label. */
export function conversionDisplayNameKey(
  row: Pick<ClientConversionScopeRow, "display_name" | "mapped_name" | "raw_name">,
): string {
  return (
    row.display_name?.trim() ||
    row.mapped_name?.trim() ||
    row.raw_name?.trim() ||
    ""
  ).toLowerCase();
}

export function conversionDisplayLabel(
  row: Pick<ClientConversionScopeRow, "display_name" | "mapped_name" | "raw_name">,
): string {
  return (
    row.display_name?.trim() ||
    row.mapped_name?.trim() ||
    row.raw_name?.trim() ||
    ""
  );
}

/** display_names that have at least one active client_conversions row. */
export function activeDisplayNameKeys(rows: ClientConversionScopeRow[]): Set<string> {
  const keys = new Set<string>();
  for (const row of rows) {
    if (!row.is_active) continue;
    const key = conversionDisplayNameKey(row);
    if (key) keys.add(key);
  }
  return keys;
}

/**
 * All config rows whose display_name has at least one active sibling.
 * Inactive raw_names contribute when their display_name is still active elsewhere.
 */
export function configsForActiveDisplayNames<T extends ClientConversionScopeRow>(
  rows: T[],
): T[] {
  const activeKeys = activeDisplayNameKeys(rows);
  if (activeKeys.size === 0) return [];
  return rows.filter((row) => {
    const key = conversionDisplayNameKey(row);
    return key.length > 0 && activeKeys.has(key);
  });
}

export function buildConversionPairIndex(
  configs: Pick<ClientConversionScopeRow, "raw_name" | "platform">[],
): ActiveConversionPairIndex {
  const pairSet = new Set<string>();
  const rawNameSet = new Set<string>();
  for (const row of configs) {
    const raw = (row.raw_name ?? "").trim();
    if (!raw) continue;
    rawNameSet.add(raw);
    pairSet.add(activeConversionPairKey(row.platform ?? "", raw));
  }
  return { pairSet, rawNames: Array.from(rawNameSet) };
}

export type ConversionBreakdownSortRow = {
  conversion_type?: string | null;
  sort_order?: number | null;
  display_name?: string | null;
  mapped_name?: string | null;
  raw_name?: string | null;
};

/** Ecommerce funnel: non-purchase types (e.g. add_to_cart, initiate_checkout) before purchase. */
export function ecommerceConversionTypeRank(conversionType: string | null | undefined): number {
  return (conversionType ?? "").trim().toLowerCase() === "purchase" ? 1 : 0;
}

/** Shared breakdown sort: optional ecommerce funnel type rank, then sort_order, then display label. */
export function compareConversionBreakdownOrder(
  a: ConversionBreakdownSortRow,
  b: ConversionBreakdownSortRow,
  options?: { ecommerceFunnel?: boolean },
): number {
  if (options?.ecommerceFunnel) {
    const typeCmp =
      ecommerceConversionTypeRank(a.conversion_type) - ecommerceConversionTypeRank(b.conversion_type);
    if (typeCmp !== 0) return typeCmp;
  }
  const sortA = a.sort_order ?? 999999;
  const sortB = b.sort_order ?? 999999;
  if (sortA !== sortB) return sortA - sortB;
  const nameA = (a.display_name ?? a.mapped_name ?? a.raw_name ?? "").trim();
  const nameB = (b.display_name ?? b.mapped_name ?? b.raw_name ?? "").trim();
  return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
}
