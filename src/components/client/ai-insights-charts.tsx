"use client";

import {
  RechartsBar,
  RechartsBarChart,
  RechartsCartesianGrid,
  RechartsLine,
  RechartsLineChart,
  RechartsResponsiveContainer,
  RechartsTooltip,
  RechartsXAxis,
  RechartsYAxis,
} from "@/components/marketing/recharts-dynamic";

type TrendPoint = { label: string; value: number };

export function InsightsTrendChart({
  title,
  data,
  valueLabel,
  formatValue,
  color = "#3b82f6",
}: {
  title: string;
  data: TrendPoint[];
  valueLabel: string;
  formatValue: (n: number) => string;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-4 text-sm text-muted-foreground">No data in range.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="mb-3 text-sm font-medium">{title}</p>
      <div className="h-56 w-full">
        <RechartsResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <RechartsCartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <RechartsXAxis dataKey="label" tick={{ fontSize: 11 }} />
            <RechartsYAxis tickFormatter={(v) => formatValue(Number(v))} width={64} />
            <RechartsTooltip
              formatter={(value) => [formatValue(Number(value)), valueLabel]}
            />
            <RechartsLine
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </RechartsLineChart>
        </RechartsResponsiveContainer>
      </div>
    </div>
  );
}

export function InsightsCompareBars({
  title,
  aLabel,
  bLabel,
  aValue,
  bValue,
  formatValue,
}: {
  title: string;
  aLabel: string;
  bLabel: string;
  aValue: number;
  bValue: number;
  formatValue: (n: number) => string;
}) {
  const chartData = [
    { name: aLabel, value: aValue },
    { name: bLabel, value: bValue },
  ];

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="mb-3 text-sm font-medium">{title}</p>
      <div className="h-48 w-full">
        <RechartsResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <RechartsCartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <RechartsXAxis dataKey="name" tick={{ fontSize: 11 }} />
            <RechartsYAxis tickFormatter={(v) => formatValue(Number(v))} width={64} />
            <RechartsTooltip
              formatter={(value) => [formatValue(Number(value)), title]}
            />
            <RechartsBar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </RechartsResponsiveContainer>
      </div>
    </div>
  );
}
