"use client";

import {
  RechartsBar,
  RechartsBarChart,
  RechartsResponsiveContainer,
  RechartsXAxis,
  RechartsYAxis,
} from "@/components/team/recharts-dynamic";
import type { DashboardBillableHoursByClientRow } from "@/lib/dashboard/types";

const BAR_COLOR = "#3b82f6";

function formatHoursTick(value: number) {
  return Number.isInteger(value) ? `${value}h` : `${value.toFixed(1)}h`;
}

export function DashboardBillableHoursChart({
  data,
}: {
  data: DashboardBillableHoursByClientRow[];
}) {
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No billable hours logged this month
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <RechartsResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
        >
          <RechartsXAxis
            dataKey="client_name"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <RechartsYAxis tickFormatter={formatHoursTick} width={48} />
          <RechartsBar
            dataKey="billable_hours"
            fill={BAR_COLOR}
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </RechartsResponsiveContainer>
    </div>
  );
}
