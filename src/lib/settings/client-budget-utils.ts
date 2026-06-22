import { canonicalReportPlatformSlug } from "@/lib/marketing/report/report-tab-platform";

export type BudgetPlatformSlug = "google" | "meta" | "microsoft" | "tiktok";

export const BUDGET_PLATFORM_ORDER: BudgetPlatformSlug[] = ["google", "meta", "microsoft", "tiktok"];

export function isBudgetPlatformSlug(s: string | null | undefined): s is BudgetPlatformSlug {
  return s === "google" || s === "meta" || s === "microsoft" || s === "tiktok";
}

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function monthLabel(year: number, month1to12: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month1to12 - 1, 1)),
  );
}

export function daysInUtcMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

export function utcMonthRange(year: number, month1to12: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const daysInMonth = daysInUtcMonth(year, month1to12);
  const start = `${year}-${pad(month1to12)}-01`;
  const end = `${year}-${pad(month1to12)}-${pad(daysInMonth)}`;
  return { start, end, daysInMonth };
}

/** Days elapsed in the month for pacing (UTC calendar vs today). */
export function daysElapsedUtc(year: number, month1to12: number, now: Date = new Date()): number {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const d = now.getUTCDate();
  const { daysInMonth } = utcMonthRange(year, month1to12);
  if (year > y || (year === y && month1to12 > m)) return 0;
  if (year < y || (year === y && month1to12 < m)) return daysInMonth;
  return d;
}

export function pacingPct(
  spendCents: number,
  budgetCents: number,
  daysElapsed: number,
  daysInMonth: number,
): number | null {
  if (budgetCents <= 0 || daysElapsed <= 0 || daysInMonth <= 0) return null;
  const expected = (budgetCents * daysElapsed) / daysInMonth;
  if (expected <= 0) return null;
  return (spendCents / expected) * 100;
}

export function pacingColorClass(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "text-zinc-500 dark:text-zinc-400";
  if (pct >= 85 && pct <= 115) return "text-emerald-600 dark:text-emerald-400";
  if ((pct >= 70 && pct < 85) || (pct > 115 && pct <= 130)) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function projectedMonthEndCents(
  spendCents: number,
  daysElapsed: number,
  daysInMonth: number,
): number | null {
  if (daysElapsed <= 0) return null;
  return Math.round((spendCents / daysElapsed) * daysInMonth);
}

/** Integer rank for chronological compare of calendar months (UTC year/month). */
export function ymRank(year: number, month1to12: number): number {
  return year * 12 + month1to12;
}

export type MonthlyBudgetYmRow = {
  year: number;
  month: number;
  platform: string;
  budget_amount_cents: number | null;
};

/**
 * For each platform, the newest `monthly_budgets` row on or before (asOfYear, asOfMonth).
 * Later calendar months stay in DB but don’t advance the effective amount until saved for that period.
 */
export function effectiveBudgetCentsPerPlatform(
  rows: MonthlyBudgetYmRow[],
  platforms: BudgetPlatformSlug[],
  asOfYear: number,
  asOfMonth: number,
): Record<BudgetPlatformSlug, number> {
  const asOfRank = ymRank(asOfYear, asOfMonth);
  const best = new Map<BudgetPlatformSlug, { rank: number; cents: number }>();

  for (const r of rows) {
    const p = (r.platform ?? "").trim().toLowerCase();
    if (!isBudgetPlatformSlug(p)) continue;
    const rRank = ymRank(r.year, r.month);
    if (rRank > asOfRank) continue;
    const cents = Math.max(0, r.budget_amount_cents ?? 0);
    const cur = best.get(p);
    if (!cur || rRank > cur.rank) {
      best.set(p, { rank: rRank, cents });
    }
  }

  const out = emptySlugRecord();
  for (const p of platforms) {
    out[p] = best.get(p)?.cents ?? 0;
  }
  return out;
}

/** Same as {@link effectiveBudgetCentsPerPlatform} but sums google + meta + microsoft (Ads total). */
export function effectiveAdsBudgetSumCents(
  rows: MonthlyBudgetYmRow[],
  asOfYear: number,
  asOfMonth: number,
): number {
  const three: BudgetPlatformSlug[] = ["google", "meta", "microsoft"];
  const e = effectiveBudgetCentsPerPlatform(rows, three, asOfYear, asOfMonth);
  return e.google + e.meta + e.microsoft;
}

/** Legacy `/ total` aggregate row saved as `platform = 'total'`. */
export function effectiveLegacyTotalRowCents(rows: MonthlyBudgetYmRow[], asOfYear: number, asOfMonth: number): number {
  const asOfRank = ymRank(asOfYear, asOfMonth);
  let bestRank = Number.NEGATIVE_INFINITY;
  let cents = 0;
  for (const r of rows) {
    if ((r.platform ?? "").trim().toLowerCase() !== "total") continue;
    const rRank = ymRank(r.year, r.month);
    if (rRank > asOfRank) continue;
    if (rRank > bestRank) {
      bestRank = rRank;
      cents = Math.max(0, r.budget_amount_cents ?? 0);
    }
  }
  return cents;
}

/** Single platform key (lead-gen); resolves effective amount at month. Returns 0 if unknown. */
export function effectiveBudgetCentsForPlatformKey(
  rows: MonthlyBudgetYmRow[],
  platformKey: string,
  asOfYear: number,
  asOfMonth: number,
): number {
  const p = platformKey.trim().toLowerCase();
  if (!isBudgetPlatformSlug(p)) {
    const asOfRank = ymRank(asOfYear, asOfMonth);
    let bestRank = Number.NEGATIVE_INFINITY;
    let cents = 0;
    for (const r of rows) {
      if ((r.platform ?? "").trim().toLowerCase() !== p) continue;
      const rRank = ymRank(r.year, r.month);
      if (rRank > asOfRank) continue;
      if (rRank > bestRank) {
        bestRank = rRank;
        cents = Math.max(0, r.budget_amount_cents ?? 0);
      }
    }
    return cents;
  }
  const m = effectiveBudgetCentsPerPlatform(rows, [p], asOfYear, asOfMonth);
  return m[p];
}

function emptySlugRecord(): Record<BudgetPlatformSlug, number> {
  return { google: 0, meta: 0, microsoft: 0, tiktok: 0 };
}

export function aggregateSpendByBudgetSlug(
  rows: { platform: string; spend_cents: number | null }[],
): Record<BudgetPlatformSlug, number> {
  const out: Record<BudgetPlatformSlug, number> = {
    google: 0,
    meta: 0,
    microsoft: 0,
    tiktok: 0,
  };
  for (const r of rows) {
    const s = canonicalReportPlatformSlug(r.platform);
    if (isBudgetPlatformSlug(s)) {
      out[s] += r.spend_cents ?? 0;
    }
  }
  return out;
}

export function prevCalendarMonth(year: number, month1to12: number): { year: number; month: number } {
  if (month1to12 === 1) return { year: year - 1, month: 12 };
  return { year, month: month1to12 - 1 };
}

/** Six calendar months ending at `endYear`/`endMonth` (inclusive), oldest first. */
export function sixMonthsEnding(endYear: number, endMonth: number): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  let y = endYear;
  let m = endMonth;
  for (let i = 0; i < 6; i++) {
    out.unshift({ year: y, month: m });
    if (m === 1) {
      m = 12;
      y -= 1;
    } else {
      m -= 1;
    }
  }
  return out;
}

export function platformDisplayName(slug: BudgetPlatformSlug): string {
  switch (slug) {
    case "google":
      return "Google Ads";
    case "meta":
      return "Meta Ads";
    case "microsoft":
      return "Microsoft Ads";
    case "tiktok":
      return "TikTok";
    default:
      return slug;
  }
}
