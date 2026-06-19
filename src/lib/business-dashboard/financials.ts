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

export function formatHistoricalFinancialCad(dollars: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

export type HistoricalYearlyTotal = {
  year: number;
  totalSales: number;
  totalExp: number;
  profit: number;
};

export const HISTORICAL_YEARLY_TOTALS: HistoricalYearlyTotal[] = [
  {
    year: 2025,
    totalSales: 373186.04,
    totalExp: 243894.03,
    profit: 129292.01,
  },
  {
    year: 2024,
    totalSales: 257137.57,
    totalExp: 85029.82,
    profit: 172107.75,
  },
  {
    year: 2023,
    totalSales: 244893.36,
    totalExp: 145862.77,
    profit: 99030.59,
  },
  {
    year: 2022,
    totalSales: 228719.71,
    totalExp: 138005.11,
    profit: 90714.6,
  },
  {
    year: 2021,
    totalSales: 251601.61,
    totalExp: 120598.94,
    profit: 131002.67,
  },
  {
    year: 2020,
    totalSales: 169047.74,
    totalExp: 91216.23,
    profit: 77831.51,
  },
  {
    year: 2019,
    totalSales: 164108.42,
    totalExp: 52851.16,
    profit: 111257.26,
  },
  {
    year: 2018,
    totalSales: 126583.81,
    totalExp: 40237.46,
    profit: 86346.35,
  },
];
