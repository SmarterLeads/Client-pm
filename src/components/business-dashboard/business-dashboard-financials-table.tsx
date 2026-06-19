"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchMonthlyFinancials,
  saveMonthlyFinancial,
} from "@/lib/actions/business-dashboard-financials";
import {
  buildMonthlyFinancialRow,
  formatFinancialCad,
  formatFinancialInputDollars,
  formatFinancialUsd,
  parseFinancialDollars,
  sumMonthlyFinancialRows,
  type MonthlyFinancialEditableField,
} from "@/lib/business-dashboard/financials";
import type { MonthlyFinancialRow } from "@/lib/business-dashboard/types";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const EDITABLE_FIELDS: MonthlyFinancialEditableField[] = [
  "cdnSales",
  "cdnExpenses",
  "usdSales",
  "usdExpenses",
];

function cellKey(month: number, field: MonthlyFinancialEditableField) {
  return `${month}-${field}`;
}

function EditableMoneyCell({
  value,
  currency,
  saved,
  disabled,
  inputRef,
  onCommit,
  onTabNext,
}: {
  value: number;
  currency: "CAD" | "USD";
  saved: boolean;
  disabled?: boolean;
  inputRef: (node: HTMLInputElement | null) => void;
  onCommit: (dollars: number) => Promise<void>;
  onTabNext: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatFinancialInputDollars(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(formatFinancialInputDollars(value));
    }
  }, [value, editing]);

  const display =
    value === 0
      ? "—"
      : currency === "CAD"
        ? formatFinancialCad(value)
        : formatFinancialUsd(value);

  async function commitValue() {
    try {
      const nextValue = parseFinancialDollars(draft);
      console.log("[FinancialsTable] parsed cell value:", {
        draft,
        parsed: nextValue,
        typeofParsed: typeof nextValue,
      });
      setEditing(false);
      if (nextValue === value) return;

      setSaving(true);
      await onCommit(nextValue);
    } catch {
      setDraft(formatFinancialInputDollars(value));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="relative flex min-h-9 items-center justify-center">
        <button
          type="button"
          disabled={disabled || saving}
          className={cn(
            "w-full rounded px-2 py-1 text-center tabular-nums transition-colors",
            "hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60",
          )}
          onClick={() => setEditing(true)}
        >
          {display}
        </button>
        {saved ? (
          <Check
            className="absolute right-1 size-3.5 text-emerald-600 dark:text-emerald-400"
            aria-label="Saved"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        autoFocus
        disabled={disabled || saving}
        className="h-9 text-center tabular-nums"
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          void commitValue();
        }}
        onKeyDown={(event) => {
          if (event.key === "Tab" && !event.shiftKey) {
            event.preventDefault();
            void commitValue().then(onTabNext);
          }
          if (event.key === "Enter") {
            event.preventDefault();
            void commitValue();
          }
          if (event.key === "Escape") {
            setDraft(formatFinancialInputDollars(value));
            setEditing(false);
          }
        }}
      />
    </div>
  );
}

export function BusinessDashboardFinancialsTable({
  initialYear,
  initialRows,
}: {
  initialYear: number;
  initialRows: MonthlyFinancialRow[];
}) {
  const [year, setYear] = useState(initialYear);
  const [rows, setRows] = useState(initialRows);
  const [savedCells, setSavedCells] = useState<Record<string, true>>({});
  const [isLoadingYear, startYearTransition] = useTransition();
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const totals = useMemo(() => sumMonthlyFinancialRows(rows), [rows]);

  const markSaved = useCallback((month: number, field: MonthlyFinancialEditableField) => {
    const key = cellKey(month, field);
    setSavedCells((prev) => ({ ...prev, [key]: true }));
    window.setTimeout(() => {
      setSavedCells((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2000);
  }, []);

  const handleCommit = useCallback(
    async (month: number, field: MonthlyFinancialEditableField, dollars: number) => {
      console.log("[FinancialsTable] saving:", { year, month, field, value: dollars });

      let payload:
        | {
            cdnSales: number;
            cdnExpenses: number;
            usdSales: number;
            usdExpenses: number;
          }
        | null = null;

      setRows((prev) =>
        prev.map((row) => {
          if (row.month !== month) return row;
          const updated = { ...row, [field]: dollars };
          payload = {
            cdnSales: updated.cdnSales,
            cdnExpenses: updated.cdnExpenses,
            usdSales: updated.usdSales,
            usdExpenses: updated.usdExpenses,
          };
          return buildMonthlyFinancialRow(month, updated);
        }),
      );

      if (!payload) return;

      const result = await saveMonthlyFinancial(year, month, payload);
      if (result.error) {
        console.error("[FinancialsTable] save failed:", result.error);
        toastError(result.error);
        const freshRows = await fetchMonthlyFinancials(year);
        setRows(freshRows);
        throw new Error(result.error);
      }

      markSaved(month, field);
    },
    [markSaved, year],
  );

  const focusNextCell = useCallback(
    (month: number, field: MonthlyFinancialEditableField) => {
      const fieldIndex = EDITABLE_FIELDS.indexOf(field);
      let nextMonth = month;
      let nextFieldIndex = fieldIndex + 1;

      if (nextFieldIndex >= EDITABLE_FIELDS.length) {
        nextFieldIndex = 0;
        nextMonth += 1;
      }

      if (nextMonth > 12) return;

      const nextKey = cellKey(nextMonth, EDITABLE_FIELDS[nextFieldIndex]!);
      inputRefs.current.get(nextKey)?.focus();
    },
    [],
  );

  function changeYear(nextYear: number) {
    startYearTransition(async () => {
      const data = await fetchMonthlyFinancials(nextYear);
      setRows(data);
      setYear(nextYear);
      setSavedCells({});
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Monthly Financials
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous year"
            disabled={isLoadingYear}
            onClick={() => changeYear(year - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-14 text-center text-sm font-medium tabular-nums">
            {year}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next year"
            disabled={isLoadingYear}
            onClick={() => changeYear(year + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden overflow-x-auto rounded-lg border border-border",
          isLoadingYear && "opacity-60",
        )}
      >
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
              <TableHead>Month</TableHead>
              <TableHead className="text-center">CDN Sales</TableHead>
              <TableHead className="text-center">CDN Exp</TableHead>
              <TableHead className="text-center">US Sales</TableHead>
              <TableHead className="text-center">US Exp</TableHead>
              <TableHead className="text-center">Total Sales</TableHead>
              <TableHead className="text-center">Total Exp</TableHead>
              <TableHead className="text-center">Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.month}>
                <TableCell className="font-medium">{row.monthLabel}</TableCell>
                <TableCell className="min-w-28 p-1">
                  <EditableMoneyCell
                    value={row.cdnSales}
                    currency="CAD"
                    saved={Boolean(savedCells[cellKey(row.month, "cdnSales")])}
                    disabled={isLoadingYear}
                    inputRef={(node) => {
                      const key = cellKey(row.month, "cdnSales");
                      if (node) inputRefs.current.set(key, node);
                      else inputRefs.current.delete(key);
                    }}
                    onCommit={(dollars) =>
                      handleCommit(row.month, "cdnSales", dollars)
                    }
                    onTabNext={() => focusNextCell(row.month, "cdnSales")}
                  />
                </TableCell>
                <TableCell className="min-w-28 p-1">
                  <EditableMoneyCell
                    value={row.cdnExpenses}
                    currency="CAD"
                    saved={Boolean(savedCells[cellKey(row.month, "cdnExpenses")])}
                    disabled={isLoadingYear}
                    inputRef={(node) => {
                      const key = cellKey(row.month, "cdnExpenses");
                      if (node) inputRefs.current.set(key, node);
                      else inputRefs.current.delete(key);
                    }}
                    onCommit={(dollars) =>
                      handleCommit(row.month, "cdnExpenses", dollars)
                    }
                    onTabNext={() => focusNextCell(row.month, "cdnExpenses")}
                  />
                </TableCell>
                <TableCell className="min-w-28 p-1">
                  <EditableMoneyCell
                    value={row.usdSales}
                    currency="USD"
                    saved={Boolean(savedCells[cellKey(row.month, "usdSales")])}
                    disabled={isLoadingYear}
                    inputRef={(node) => {
                      const key = cellKey(row.month, "usdSales");
                      if (node) inputRefs.current.set(key, node);
                      else inputRefs.current.delete(key);
                    }}
                    onCommit={(dollars) =>
                      handleCommit(row.month, "usdSales", dollars)
                    }
                    onTabNext={() => focusNextCell(row.month, "usdSales")}
                  />
                </TableCell>
                <TableCell className="min-w-28 p-1">
                  <EditableMoneyCell
                    value={row.usdExpenses}
                    currency="USD"
                    saved={Boolean(savedCells[cellKey(row.month, "usdExpenses")])}
                    disabled={isLoadingYear}
                    inputRef={(node) => {
                      const key = cellKey(row.month, "usdExpenses");
                      if (node) inputRefs.current.set(key, node);
                      else inputRefs.current.delete(key);
                    }}
                    onCommit={(dollars) =>
                      handleCommit(row.month, "usdExpenses", dollars)
                    }
                    onTabNext={() => focusNextCell(row.month, "usdExpenses")}
                  />
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {formatFinancialCad(row.totalSalesCad)}
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {formatFinancialCad(row.totalExpCad)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-center tabular-nums font-medium",
                    row.profitCad > 0 &&
                      "text-emerald-700 dark:text-emerald-400",
                    row.profitCad < 0 && "text-destructive",
                  )}
                >
                  {formatFinancialCad(row.profitCad)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/30 font-semibold hover:bg-muted/30">
              <TableCell>Total</TableCell>
              <TableCell className="text-center tabular-nums">
                {formatFinancialCad(totals.cdnSales)}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatFinancialCad(totals.cdnExpenses)}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatFinancialUsd(totals.usdSales)}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatFinancialUsd(totals.usdExpenses)}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatFinancialCad(totals.totalSalesCad)}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatFinancialCad(totals.totalExpCad)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center tabular-nums",
                  totals.profitCad > 0 &&
                    "text-emerald-700 dark:text-emerald-400",
                  totals.profitCad < 0 && "text-destructive",
                )}
              >
                {formatFinancialCad(totals.profitCad)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
