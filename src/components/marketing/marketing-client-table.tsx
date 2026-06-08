import Link from "next/link";
import {
  formatMarketingCurrency,
  formatMarketingNumber,
  formatMarketingRoas,
  formatPlatformLabel,
} from "@/lib/marketing/format";
import type { MarketingClientRow } from "@/lib/marketing/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MarketingClientTableProps = {
  clients: MarketingClientRow[];
};

function displayValue<T>(hasData: boolean, value: T, formatter: (v: T) => string) {
  if (!hasData) return "--";
  return formatter(value);
}

export function MarketingClientTable({ clients }: MarketingClientTableProps) {
  if (clients.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No clients with report slugs configured
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Agency</TableHead>
            <TableHead>Platform(s)</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">Conversions</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            <TableHead className="text-right">Conversion value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.clientId}>
              <TableCell className="font-medium">
                <Link
                  href={`/marketing/${client.reportSlug}`}
                  className="hover:underline"
                >
                  {client.clientName}
                </Link>
              </TableCell>
              <TableCell>{client.agencyName}</TableCell>
              <TableCell>
                {client.hasData
                  ? client.platforms.map(formatPlatformLabel).join(", ") || "--"
                  : "--"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {displayValue(client.hasData, client.spendCents, formatMarketingCurrency)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {displayValue(client.hasData, client.clicks, formatMarketingNumber)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {displayValue(client.hasData, client.conversions, formatMarketingNumber)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {client.hasData ? formatMarketingRoas(client.roas) : "--"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {displayValue(
                  client.hasData,
                  client.conversionValueCents,
                  formatMarketingCurrency,
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
