import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { marketingChannelAccentColor } from "@/lib/business-dashboard/channels";
import {
  formatBusinessMrrCad,
  formatBusinessMrrCadOrDash,
} from "@/lib/business-dashboard/format";
import type {
  BusinessDashboardMrrServiceRow,
  BusinessDashboardServiceRow,
} from "@/lib/business-dashboard/types";

const serviceGridClassName = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";

function ServiceEmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

export function ActiveClientsByServiceCards({
  data,
}: {
  data: BusinessDashboardServiceRow[];
}) {
  if (data.length === 0) {
    return (
      <ServiceEmptyState message="No active clients with marketing channels configured." />
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
          <CardContent className="pb-4">
            <p className="text-3xl font-semibold tabular-nums tracking-tight">
              {row.clientCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">active clients</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MrrByServiceCards({
  data,
}: {
  data: BusinessDashboardMrrServiceRow[];
}) {
  if (data.length === 0) {
    return (
      <ServiceEmptyState message="No MRR breakdown data for active clients." />
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
          <CardContent className="pb-4">
            <p className="text-3xl font-semibold tabular-nums tracking-tight">
              {formatBusinessMrrCad(row.mrrCadCents)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">monthly revenue</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatBusinessMrrCadOrDash(row.averageMrrCadCents)} avg / client
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
