import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardKpis } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

type DashboardKpiCardsProps = {
  kpis: DashboardKpis;
};

function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

export function DashboardKpiCards({ kpis }: DashboardKpiCardsProps) {
  const overdueHighlight = kpis.overdueTasks > 0;

  const cards = [
    {
      title: "Active clients",
      value: kpis.activeClients,
      highlight: false,
    },
    {
      title: "Open tasks",
      value: kpis.openTasks,
      highlight: false,
    },
    {
      title: "Overdue tasks",
      value: kpis.overdueTasks,
      highlight: overdueHighlight,
    },
    {
      title: "Billable hours this month",
      value: formatHours(kpis.billableHoursThisMonth),
      highlight: false,
      suffix: "h",
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
              {"suffix" in card && card.suffix ? (
                <span className="ml-1 text-lg font-medium text-muted-foreground">
                  {card.suffix}
                </span>
              ) : null}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
