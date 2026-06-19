"use client";

import {
  formatHistoricalFinancialCad,
  HISTORICAL_YEARLY_TOTALS,
} from "@/lib/business-dashboard/financials";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function BusinessDashboardYearlyHistoryTable() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">
        Historical Yearly Totals
      </h2>

      <div className="overflow-hidden overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Total Sales</TableHead>
              <TableHead className="text-right">Total Expenses</TableHead>
              <TableHead className="text-right">Total Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {HISTORICAL_YEARLY_TOTALS.map((row) => (
              <TableRow key={row.year}>
                <TableCell className="font-medium tabular-nums">
                  {row.year}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatHistoricalFinancialCad(row.totalSales)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatHistoricalFinancialCad(row.totalExp)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums font-medium",
                    row.profit > 0 &&
                      "text-emerald-700 dark:text-emerald-400",
                    row.profit < 0 && "text-destructive",
                  )}
                >
                  {formatHistoricalFinancialCad(row.profit)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
