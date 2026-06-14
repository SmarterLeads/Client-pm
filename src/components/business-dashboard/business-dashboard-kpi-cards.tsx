import { UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBusinessMrrCad } from "@/lib/business-dashboard/format";
import type { BusinessDashboardKpis } from "@/lib/business-dashboard/types";
import { cn } from "@/lib/utils";

type KpiHighlight = "none" | "positive" | "negative";

type KpiCard = {
  title: string;
  value: string;
  highlight: KpiHighlight;
  subtitle?: string;
  icon?: typeof UserPlus;
};

export function BusinessDashboardKpiCards({
  kpis,
}: {
  kpis: BusinessDashboardKpis;
}) {
  const newClientsHighlight = kpis.newClientsLast30Days > 0;
  const churnHighlight = kpis.churnedLast30Days > 0;

  const cards: KpiCard[] = [
    {
      title: "Active clients",
      value: String(kpis.activeClients),
      highlight: "none",
    },
    {
      title: "Total MRR",
      value: formatBusinessMrrCad(kpis.totalMrrCadCents),
      highlight: "none",
      subtitle: "CAD (USD converted at 1.35)",
    },
    {
      title: "Average MRR per client",
      value:
        kpis.averageMrrCadCents != null
          ? formatBusinessMrrCad(kpis.averageMrrCadCents)
          : "—",
      highlight: "none",
    },
    {
      title: "New Clients (30 days)",
      value: String(kpis.newClientsLast30Days),
      highlight: newClientsHighlight ? "positive" : "none",
      icon: UserPlus,
    },
    {
      title: "Churned clients (last 30 days)",
      value: String(kpis.churnedLast30Days),
      highlight: churnHighlight ? "negative" : "none",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card
            key={card.title}
            className={cn(
              card.highlight === "positive" &&
                "ring-2 ring-emerald-500/40 dark:ring-emerald-500/50",
              card.highlight === "negative" &&
                "ring-2 ring-destructive/40 dark:ring-destructive/50",
            )}
          >
            <CardHeader className="pb-0">
              <CardTitle
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium text-muted-foreground",
                  card.highlight === "positive" && "text-emerald-700 dark:text-emerald-400",
                  card.highlight === "negative" && "text-destructive",
                )}
              >
                {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-3xl font-semibold tabular-nums tracking-tight",
                  card.highlight === "positive" &&
                    "text-emerald-700 dark:text-emerald-400",
                  card.highlight === "negative" && "text-destructive",
                )}
              >
                {card.value}
              </p>
              {card.subtitle ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.subtitle}
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
