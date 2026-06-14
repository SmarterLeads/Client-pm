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
  | "cdnSales"
  | "cdnExpenses"
  | "usdSales"
  | "usdExpenses";

export type MonthlyFinancialDraft = Pick<
  MonthlyFinancialRow,
  "month" | "cdnSales" | "cdnExpenses" | "usdSales" | "usdExpenses"
>;

export function calculateMonthlyFinancialTotals(row: MonthlyFinancialDraft) {
  const totalSalesCad =
    row.cdnSales + row.usdSales * FINANCIALS_USD_TO_CAD_RATE;
  const totalExpCad =
    row.cdnExpenses + row.usdExpenses * FINANCIALS_USD_TO_CAD_RATE;

  return {
    totalSalesCad,
    totalExpCad,
    profitCad: totalSalesCad - totalExpCad,
  };
}

export function buildMonthlyFinancialRow(
  month: number,
  draft: Partial<MonthlyFinancialDraft> = {},
): MonthlyFinancialRow {
  const base: MonthlyFinancialDraft = {
    month,
    cdnSales: draft.cdnSales ?? 0,
    cdnExpenses: draft.cdnExpenses ?? 0,
    usdSales: draft.usdSales ?? 0,
    usdExpenses: draft.usdExpenses ?? 0,
  };

  return {
    ...base,
    monthLabel: FINANCIAL_MONTH_NAMES[month - 1] ?? `Month ${month}`,
    ...calculateMonthlyFinancialTotals(base),
  };
}

export function parseFinancialDollars(value: string): number {
  const normalized = value.replace(/[$,\s]/g, "").trim();
  if (!normalized) return 0;

  const dollars = Number(normalized);
  if (!Number.isFinite(dollars)) {
    throw new Error("Enter a valid dollar amount.");
  }

  return dollars;
}

export function formatFinancialCad(dollars: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

export function formatFinancialUsd(dollars: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

export function formatFinancialInputDollars(dollars: number): string {
  if (dollars === 0) return "";
  return String(dollars).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function sumMonthlyFinancialRows(rows: MonthlyFinancialRow[]) {
  return rows.reduce(
    (totals, row) => ({
      cdnSales: totals.cdnSales + row.cdnSales,
      cdnExpenses: totals.cdnExpenses + row.cdnExpenses,
      usdSales: totals.usdSales + row.usdSales,
      usdExpenses: totals.usdExpenses + row.usdExpenses,
      totalSalesCad: totals.totalSalesCad + row.totalSalesCad,
      totalExpCad: totals.totalExpCad + row.totalExpCad,
      profitCad: totals.profitCad + row.profitCad,
    }),
    {
      cdnSales: 0,
      cdnExpenses: 0,
      usdSales: 0,
      usdExpenses: 0,
      totalSalesCad: 0,
      totalExpCad: 0,
      profitCad: 0,
    },
  );
}
