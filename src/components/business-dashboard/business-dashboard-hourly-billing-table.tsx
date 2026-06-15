import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatBillableHours,
  formatClientCurrencyAmount,
  formatHourlyRate,
} from "@/lib/clients/hourly-billing";
import { normalizeClientCurrency } from "@/lib/clients/overview-fields";
import type { HourlyBillingRow } from "@/lib/business-dashboard/types";
import Link from "next/link";

export function BusinessDashboardHourlyBillingTable({
  rows,
}: {
  rows: HourlyBillingRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No hourly clients configured
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
            <TableHead>Client</TableHead>
            <TableHead>Agency</TableHead>
            <TableHead className="text-right">Hourly Rate</TableHead>
            <TableHead className="text-right">Hours This Month</TableHead>
            <TableHead className="text-right">Amount Due</TableHead>
            <TableHead className="text-center">Currency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const currency = normalizeClientCurrency(row.currency);

            return (
              <TableRow key={row.clientId}>
                <TableCell>
                  <Link
                    href={`/clients/${row.clientId}`}
                    className="font-medium hover:underline"
                  >
                    {row.clientName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.agencyName ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatHourlyRate(row.hourlyRate, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBillableHours(row.hours)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatClientCurrencyAmount(row.amountDue, currency)}
                </TableCell>
                <TableCell className="text-center">{currency}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
