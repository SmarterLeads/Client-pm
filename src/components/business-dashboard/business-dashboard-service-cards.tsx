import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { marketingChannelAccentColor } from "@/lib/business-dashboard/channels";
import {
  formatBusinessMrrCad,
} from "@/lib/business-dashboard/format";
import type { BusinessDashboardServiceOverviewRow } from "@/lib/business-dashboard/types";

const serviceGridClassName = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

export function ServicesOverviewCards({
  data,
}: {
  data: BusinessDashboardServiceOverviewRow[];
}) {
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No marketing channels with active clients or MRR configured.
      </p>
    );
  }

  return (
    <div className={serviceGridClassName}>
      {data.map((row) => (
        <Card key={row.channel} className="overflow-hidden py-0">
          <div
            className="h-1.5 w-full shrink-0"
            style={{ backgroundColor: marketingChannelAccentColor(row.channel) }}
          />
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold tracking-tight">
              {row.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  {row.clientCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">clients</p>
              </div>
              <div>
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  {formatBusinessMrrCad(row.mrrCadCents)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">MRR</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {row.averageMrrCadCents != null && row.averageMrrCadCents > 0
                ? `avg ${formatBusinessMrrCad(row.averageMrrCadCents)} / client`
                : "— avg / client"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
