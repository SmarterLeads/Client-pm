import {
  formatMarketingCurrency,
  formatMarketingNumber,
  formatMarketingRoas,
  formatPlatformLabel,
} from "@/lib/marketing/format";
import type { MarketingPlatformRow } from "@/lib/marketing/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MarketingPlatformTableProps = {
  rows: MarketingPlatformRow[];
};

export function MarketingPlatformTable({ rows }: MarketingPlatformTableProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No platform data for this period
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">Impressions</TableHead>
            <TableHead className="text-right">Conversions</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.platform}>
              <TableCell className="font-medium">
                {formatPlatformLabel(row.platform)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMarketingCurrency(row.spendCents)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMarketingNumber(row.clicks)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMarketingNumber(row.impressions)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMarketingNumber(row.conversions)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMarketingRoas(row.roas)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
