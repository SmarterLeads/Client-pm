import {
  formatMarketingCurrency,
  formatMarketingNumber,
  formatPlatformLabel,
} from "@/lib/marketing/format";
import type { MarketingCampaignRow } from "@/lib/marketing/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MarketingCampaignTableProps = {
  campaigns: MarketingCampaignRow[];
};

export function MarketingCampaignTable({ campaigns }: MarketingCampaignTableProps) {
  if (campaigns.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No campaigns found for this client
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">Conversions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium">{campaign.campaignName}</TableCell>
              <TableCell>{formatPlatformLabel(campaign.platform)}</TableCell>
              <TableCell>{campaign.campaignType ?? "--"}</TableCell>
              <TableCell>{campaign.status ?? "--"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMarketingCurrency(campaign.spendCents)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMarketingNumber(campaign.conversions)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
