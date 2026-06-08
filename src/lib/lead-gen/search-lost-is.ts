/** Impression-weighted search lost IS averages (percent 0–100). */
export type SearchLostIsRollup = {
  searchLostRankAvg: number;
  searchLostBudgetAvg: number;
};

export function emptySearchLostIsRollup(): SearchLostIsRollup {
  return { searchLostRankAvg: 0, searchLostBudgetAvg: 0 };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Impression-weighted average of daily `search_lost_*` columns for rows in [start, end].
 */
export function aggregateSearchLostIsFromDailyRows(
  rows: Array<{
    report_date: string;
    impressions?: number | null;
    search_lost_rank?: number | null;
    search_lost_budget?: number | null;
  }>,
  start: string,
  end: string,
): SearchLostIsRollup {
  let rankWeighted = 0;
  let budgetWeighted = 0;
  let impressions = 0;

  for (const row of rows) {
    if (row.report_date < start || row.report_date > end) continue;
    const imps = Number(row.impressions ?? 0);
    if (imps <= 0) continue;
    impressions += imps;
    if (row.search_lost_rank != null && Number.isFinite(Number(row.search_lost_rank))) {
      rankWeighted += Number(row.search_lost_rank) * imps;
    }
    if (row.search_lost_budget != null && Number.isFinite(Number(row.search_lost_budget))) {
      budgetWeighted += Number(row.search_lost_budget) * imps;
    }
  }

  if (impressions <= 0) return emptySearchLostIsRollup();
  return {
    searchLostRankAvg: round1(rankWeighted / impressions),
    searchLostBudgetAvg: round1(budgetWeighted / impressions),
  };
}

/** Parse Google/Microsoft API fraction or percent into 0–100 display percent. */
export function normalizeLostIsPercent(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw <= 1) return round1(raw * 100);
  return round1(raw);
}

/** Parse Microsoft CSV percent cells like "12.34" or "12.34%". */
export function parseLostIsPercentCell(raw: string | undefined | null): number {
  if (!raw?.trim()) return 0;
  const n = Number(String(raw).replace(/%/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return 0;
  return normalizeLostIsPercent(n);
}
