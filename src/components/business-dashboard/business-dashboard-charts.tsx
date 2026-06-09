"use client";

import {
  RechartsBar,
  RechartsBarChart,
  RechartsResponsiveContainer,
  RechartsXAxis,
  RechartsYAxis,
} from "@/components/team/recharts-dynamic";
import { formatBusinessMrrCad } from "@/lib/business-dashboard/format";
import type {
  BusinessDashboardMrrServiceRow,
  BusinessDashboardServiceRow,
} from "@/lib/business-dashboard/types";

const BAR_COLOR = "#3b82f6";
const MRR_BAR_COLOR = "#10b981";

function formatMrrAxisTick(cents: number) {
  return formatBusinessMrrCad(cents).replace(/\.00$/, "");
}

export function ActiveClientsByServiceChart({
  data,
}: {
  data: BusinessDashboardServiceRow[];
}) {
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No active clients with marketing channels configured.
      </p>
    );
  }

  return (
    <div className="h-80 w-full">
      <RechartsResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 72 }}
        >
          <RechartsXAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={72}
          />
          <RechartsYAxis allowDecimals={false} width={40} />
          <RechartsBar
            dataKey="clientCount"
            fill={BAR_COLOR}
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </RechartsResponsiveContainer>
    </div>
  );
}

export function MrrByServiceChart({
  data,
}: {
  data: BusinessDashboardMrrServiceRow[];
}) {
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No MRR breakdown data for active clients.
      </p>
    );
  }

  const chartData = data.map((row) => ({
    ...row,
    mrrDollars: row.mrrCadCents / 100,
  }));

  return (
    <div className="h-80 w-full">
      <RechartsResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 72 }}
        >
          <RechartsXAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={72}
          />
          <RechartsYAxis
            tickFormatter={(value: number) =>
              formatMrrAxisTick(Math.round(value * 100))
            }
            width={64}
          />
          <RechartsBar
            dataKey="mrrDollars"
            fill={MRR_BAR_COLOR}
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </RechartsResponsiveContainer>
    </div>
  );
}
