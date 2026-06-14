import type { MonthlyFinancialRow } from "@/lib/business-dashboard/types";

export const FINANCIALS_USD_TO_CAD_RATE = 1.4;

export const FINANCIAL_MONTH_NAMES = [
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

export type MonthlyFinancialEditableField =
  | "cdnSalesCents"
  | "cdnExpCents"
  | "usSalesCents"
  | "usExpCents";

export type MonthlyFinancialDraft = Pick<
  MonthlyFinancialRow,
  | "month"
  | "cdnSalesCents"
  | "cdnExpCents"
  | "usSalesCents"
  | "usExpCents"
>;

export function calculateMonthlyFinancialTotals(row: MonthlyFinancialDraft) {
  const totalSalesCadCents =
    row.cdnSalesCents +
    Math.round(row.usSalesCents * FINANCIALS_USD_TO_CAD_RATE);
  const totalExpCadCents =
    row.cdnExpCents + Math.round(row.usExpCents * FINANCIALS_USD_TO_CAD_RATE);

  return {
    totalSalesCadCents,
    totalExpCadCents,
    profitCadCents: totalSalesCadCents - totalExpCadCents,
  };
}

export function buildMonthlyFinancialRow(
  month: number,
  draft: Partial<MonthlyFinancialDraft> = {},
): MonthlyFinancialRow {
  const base: MonthlyFinancialDraft = {
    month,
    cdnSalesCents: draft.cdnSalesCents ?? 0,
    cdnExpCents: draft.cdnExpCents ?? 0,
    usSalesCents: draft.usSalesCents ?? 0,
    usExpCents: draft.usExpCents ?? 0,
  };

  return {
    ...base,
    monthLabel: FINANCIAL_MONTH_NAMES[month - 1] ?? `Month ${month}`,
    ...calculateMonthlyFinancialTotals(base),
  };
}

export function parseFinancialDollarsToCents(value: string): number {
  const normalized = value.replace(/[$,\s]/g, "").trim();
  if (!normalized) return 0;

  const dollars = Number(normalized);
  if (!Number.isFinite(dollars)) {
    throw new Error("Enter a valid dollar amount.");
  }

  return Math.round(dollars * 100);
}

export function formatFinancialCad(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatFinancialUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatFinancialInputDollars(cents: number): string {
  if (cents === 0) return "";
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

export function sumMonthlyFinancialRows(rows: MonthlyFinancialRow[]) {
  return rows.reduce(
    (totals, row) => ({
      cdnSalesCents: totals.cdnSalesCents + row.cdnSalesCents,
      cdnExpCents: totals.cdnExpCents + row.cdnExpCents,
      usSalesCents: totals.usSalesCents + row.usSalesCents,
      usExpCents: totals.usExpCents + row.usExpCents,
      totalSalesCadCents: totals.totalSalesCadCents + row.totalSalesCadCents,
      totalExpCadCents: totals.totalExpCadCents + row.totalExpCadCents,
      profitCadCents: totals.profitCadCents + row.profitCadCents,
    }),
    {
      cdnSalesCents: 0,
      cdnExpCents: 0,
      usSalesCents: 0,
      usExpCents: 0,
      totalSalesCadCents: 0,
      totalExpCadCents: 0,
      profitCadCents: 0,
    },
  );
}
