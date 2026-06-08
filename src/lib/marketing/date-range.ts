import type { MarketingDateBounds, MarketingDateRange } from "@/lib/marketing/types";
import { MARKETING_DATE_RANGES } from "@/lib/marketing/types";

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isMarketingDateRange(value: string): value is MarketingDateRange {
  return (MARKETING_DATE_RANGES as readonly string[]).includes(value);
}

export function resolveMarketingDateRange(
  value: string | undefined,
): MarketingDateBounds {
  const range: MarketingDateRange = isMarketingDateRange(value ?? "")
    ? (value as MarketingDateRange)
    : "this_month";

  const today = new Date();
  const todayIso = toIsoDate(today);

  switch (range) {
    case "last_month": {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return {
        range,
        from: toIsoDate(startOfMonth(lastMonth)),
        to: toIsoDate(endOfMonth(lastMonth)),
      };
    }
    case "last_30_days":
      return {
        range,
        from: toIsoDate(addDays(today, -29)),
        to: todayIso,
      };
    case "last_90_days":
      return {
        range,
        from: toIsoDate(addDays(today, -89)),
        to: todayIso,
      };
    case "this_month":
    default:
      return {
        range: "this_month",
        from: toIsoDate(startOfMonth(today)),
        to: todayIso,
      };
  }
}

export const MARKETING_DATE_RANGE_LABELS: Record<MarketingDateRange, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_30_days: "Last 30 days",
  last_90_days: "Last 90 days",
};
