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
  parseFinancialDollarsToCents,
  sumMonthlyFinancialRows,
  type MonthlyFinancialEditableField,
} from "@/lib/business-dashboard/financials";
import type { MonthlyFinancialRow } from "@/lib/business-dashboard/types";
import { cn } from "@/lib/utils";

const EDITABLE_FIELDS: MonthlyFinancialEditableField[] = [
  "cdnSalesCents",
  "cdnExpCents",
  "usSalesCents",
  "usExpCents",
];

function cellKey(month: number, field: MonthlyFinancialEditableField) {
  return `${month}-${field}`;
}

function EditableMoneyCell({
  month,
  field,
  cents,
  currency,
  saved,
  disabled,
  inputRef,
  onCommit,
  onTabNext,
}: {
  month: number;
  field: MonthlyFinancialEditableField;
  cents: number;
  currency: "CAD" | "USD";
  saved: boolean;
  disabled?: boolean;
  inputRef: (node: HTMLInputElement | null) => void;
  onCommit: (cents: number) => Promise<void>;
  onTabNext: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatFinancialInputDollars(cents));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(formatFinancialInputDollars(cents));
    }
  }, [cents, editing]);

  const display =
    cents === 0
      ? "—"
      : currency === "CAD"
        ? formatFinancialCad(cents)
        : formatFinancialUsd(cents);

  async function commitValue() {
    try {
      const nextCents = parseFinancialDollarsToCents(draft);
      setEditing(false);
      if (nextCents === cents) return;

      setSaving(true);
      await onCommit(nextCents);
    } catch {
      setDraft(formatFinancialInputDollars(cents));
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
            setDraft(formatFinancialInputDollars(cents));
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
    async (month: number, field: MonthlyFinancialEditableField, cents: number) => {
      let payload:
        | {
            cdnSalesCents: number;
            cdnExpCents: number;
            usSalesCents: number;
            usExpCents: number;
          }
        | null = null;

      setRows((prev) =>
        prev.map((row) => {
          if (row.month !== month) return row;
          const updated = { ...row, [field]: cents };
          payload = {
            cdnSalesCents: updated.cdnSalesCents,
            cdnExpCents: updated.cdnExpCents,
            usSalesCents: updated.usSalesCents,
            usExpCents: updated.usExpCents,
          };
          return buildMonthlyFinancialRow(month, updated);
        }),
      );

      if (!payload) return;

      const result = await saveMonthlyFinancial(year, month, payload);
      if (result.error) {
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
                    month={row.month}
                    field="cdnSalesCents"
                    cents={row.cdnSalesCents}
                    currency="CAD"
                    saved={Boolean(savedCells[cellKey(row.month, "cdnSalesCents")])}
                    disabled={isLoadingYear}
                    inputRef={(node) => {
                      const key = cellKey(row.month, "cdnSalesCents");
                      if (node) inputRefs.current.set(key, node);
                      else inputRefs.current.delete(key);
                    }}
                    onCommit={(cents) =>
                      handleCommit(row.month, "cdnSalesCents", cents)
                    }
                    onTabNext={() => focusNextCell(row.month, "cdnSalesCents")}
                  />
                </TableCell>
                <TableCell className="min-w-28 p-1">
                  <EditableMoneyCell
                    month={row.month}
                    field="cdnExpCents"
                    cents={row.cdnExpCents}
                    currency="CAD"
                    saved={Boolean(savedCells[cellKey(row.month, "cdnExpCents")])}
                    disabled={isLoadingYear}
                    inputRef={(node) => {
                      const key = cellKey(row.month, "cdnExpCents");
                      if (node) inputRefs.current.set(key, node);
                      else inputRefs.current.delete(key);
                    }}
                    onCommit={(cents) =>
                      handleCommit(row.month, "cdnExpCents", cents)
                    }
                    onTabNext={() => focusNextCell(row.month, "cdnExpCents")}
                  />
                </TableCell>
                <TableCell className="min-w-28 p-1">
                  <EditableMoneyCell
                    month={row.month}
                    field="usSalesCents"
                    cents={row.usSalesCents}
                    currency="USD"
                    saved={Boolean(savedCells[cellKey(row.month, "usSalesCents")])}
                    disabled={isLoadingYear}
                    inputRef={(node) => {
                      const key = cellKey(row.month, "usSalesCents");
                      if (node) inputRefs.current.set(key, node);
                      else inputRefs.current.delete(key);
                    }}
                    onCommit={(cents) =>
                      handleCommit(row.month, "usSalesCents", cents)
                    }
                    onTabNext={() => focusNextCell(row.month, "usSalesCents")}
                  />
                </TableCell>
                <TableCell className="min-w-28 p-1">
                  <EditableMoneyCell
                    month={row.month}
                    field="usExpCents"
                    cents={row.usExpCents}
                    currency="USD"
                    saved={Boolean(savedCells[cellKey(row.month, "usExpCents")])}
                    disabled={isLoadingYear}
                    inputRef={(node) => {
                      const key = cellKey(row.month, "usExpCents");
                      if (node) inputRefs.current.set(key, node);
                      else inputRefs.current.delete(key);
                    }}
                    onCommit={(cents) =>
                      handleCommit(row.month, "usExpCents", cents)
                    }
                    onTabNext={() => focusNextCell(row.month, "usExpCents")}
                  />
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {formatFinancialCad(row.totalSalesCadCents)}
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {formatFinancialCad(row.totalExpCadCents)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-center tabular-nums font-medium",
                    row.profitCadCents > 0 &&
                      "text-emerald-700 dark:text-emerald-400",
                    row.profitCadCents < 0 && "text-destructive",
                  )}
                >
                  {formatFinancialCad(row.profitCadCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/30 font-semibold hover:bg-muted/30">
              <TableCell>Total</TableCell>
              <TableCell className="text-center tabular-nums">
                {formatFinancialCad(totals.cdnSalesCents)}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatFinancialCad(totals.cdnExpCents)}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatFinancialUsd(totals.usSalesCents)}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatFinancialUsd(totals.usExpCents)}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatFinancialCad(totals.totalSalesCadCents)}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatFinancialCad(totals.totalExpCadCents)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center tabular-nums",
                  totals.profitCadCents > 0 &&
                    "text-emerald-700 dark:text-emerald-400",
                  totals.profitCadCents < 0 && "text-destructive",
                )}
              >
                {formatFinancialCad(totals.profitCadCents)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
