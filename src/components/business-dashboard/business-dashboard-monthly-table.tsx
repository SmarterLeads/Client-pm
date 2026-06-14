import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBusinessMrrCad } from "@/lib/business-dashboard/format";
import type { BusinessDashboardMonthlyResultRow } from "@/lib/business-dashboard/types";
import { cn } from "@/lib/utils";

export function BusinessDashboardMonthlyTable({
  rows,
}: {
  rows: BusinessDashboardMonthlyResultRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No monthly results available yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
            <TableHead>Month</TableHead>
            <TableHead className="text-center">Active Clients</TableHead>
            <TableHead className="text-center">Total MRR</TableHead>
            <TableHead className="text-center">New Clients</TableHead>
            <TableHead className="text-center">Churned Clients</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.monthStart}
              className={cn(
                row.isCurrentMonth &&
                  "bg-sky-50 font-medium hover:bg-sky-50 dark:bg-sky-950/30 dark:hover:bg-sky-950/30",
              )}
            >
              <TableCell>{row.monthLabel}</TableCell>
              <TableCell className="text-center tabular-nums">
                {row.activeClients}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatBusinessMrrCad(row.totalMrrCadCents)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center tabular-nums",
                  row.newClients > 0 &&
                    "font-medium text-emerald-700 dark:text-emerald-400",
                )}
              >
                {row.newClients}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center tabular-nums",
                  row.churnedClients > 0 &&
                    "font-medium text-destructive",
                )}
              >
                {row.churnedClients}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
