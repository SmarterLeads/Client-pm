import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatBusinessMrrCadOrDash,
} from "@/lib/business-dashboard/format";
import type { BusinessDashboardAgencyRow } from "@/lib/business-dashboard/types";
import { agencyAccentColor } from "@/lib/queries/agencies";
import { cn } from "@/lib/utils";

export function BusinessDashboardAgencyCards({
  agencies,
}: {
  agencies: BusinessDashboardAgencyRow[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {agencies.map((agency) => {
        const accent = agencyAccentColor(agency.primaryColor);
        const churnHighlight = agency.churnedLast30Days > 0;

        return (
          <Card key={agency.id} className="overflow-hidden py-0">
            <div
              className="h-1.5 w-full shrink-0"
              style={{ backgroundColor: accent }}
            />
            <CardHeader className="pb-0">
              <CardTitle className="text-base font-semibold tracking-tight">
                {agency.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total MRR
                </p>
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {formatBusinessMrrCadOrDash(agency.totalMrrCadCents)}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Active clients
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {agency.activeClients}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Avg MRR / client
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {agency.averageMrrCadCents != null
                      ? formatBusinessMrrCadOrDash(agency.averageMrrCadCents)
                      : "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt
                    className={cn(
                      "text-xs",
                      churnHighlight
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    Churned (last 30 days)
                  </dt>
                  <dd
                    className={cn(
                      "font-medium tabular-nums",
                      churnHighlight && "text-destructive",
                    )}
                  >
                    {agency.churnedLast30Days}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
