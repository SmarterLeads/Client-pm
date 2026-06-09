import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBusinessMrrCad } from "@/lib/business-dashboard/format";
import type { BusinessDashboardKpis } from "@/lib/business-dashboard/types";
import { cn } from "@/lib/utils";

export function BusinessDashboardKpiCards({
  kpis,
}: {
  kpis: BusinessDashboardKpis;
}) {
  const churnHighlight = kpis.churnedLast30Days > 0;

  const cards = [
    {
      title: "Active clients",
      value: String(kpis.activeClients),
      highlight: false,
    },
    {
      title: "Total MRR",
      value: formatBusinessMrrCad(kpis.totalMrrCadCents),
      highlight: false,
      subtitle: "CAD (USD converted at 1.35)",
    },
    {
      title: "Average MRR per client",
      value:
        kpis.averageMrrCadCents != null
          ? formatBusinessMrrCad(kpis.averageMrrCadCents)
          : "—",
      highlight: false,
    },
    {
      title: "Churned clients (last 30 days)",
      value: String(kpis.churnedLast30Days),
      highlight: churnHighlight,
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={cn(
            card.highlight &&
              "ring-2 ring-destructive/40 dark:ring-destructive/50",
          )}
        >
          <CardHeader className="pb-0">
            <CardTitle
              className={cn(
                "text-sm font-medium text-muted-foreground",
                card.highlight && "text-destructive",
              )}
            >
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-3xl font-semibold tabular-nums tracking-tight",
                card.highlight && "text-destructive",
              )}
            >
              {card.value}
            </p>
            {"subtitle" in card && card.subtitle ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {card.subtitle}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
