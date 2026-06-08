import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatMarketingCurrency,
  formatMarketingNumber,
  formatMarketingRoas,
} from "@/lib/marketing/format";
import type { MarketingKpiTotals } from "@/lib/marketing/types";

type MarketingKpiCardsProps = {
  totals: MarketingKpiTotals;
  includeImpressions?: boolean;
};

export function MarketingKpiCards({
  totals,
  includeImpressions = false,
}: MarketingKpiCardsProps) {
  const cards = [
    { title: "Total spend", value: formatMarketingCurrency(totals.spendCents) },
    { title: "Total clicks", value: formatMarketingNumber(totals.clicks) },
    ...(includeImpressions
      ? [
          {
            title: "Impressions",
            value: formatMarketingNumber(totals.impressions),
          },
        ]
      : []),
    {
      title: "Total conversions",
      value: formatMarketingNumber(totals.conversions),
    },
    { title: "Average ROAS", value: formatMarketingRoas(totals.averageRoas) },
    {
      title: "Conversion value",
      value: formatMarketingCurrency(totals.conversionValueCents),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
