"use client";

import {
  RechartsCartesianGrid,
  RechartsLine,
  RechartsLineChart,
  RechartsResponsiveContainer,
  RechartsTooltip,
  RechartsXAxis,
  RechartsYAxis,
} from "@/components/marketing/recharts-dynamic";
import { formatMarketingCurrency } from "@/lib/marketing/format";
import type { MarketingDailyPoint } from "@/lib/marketing/types";

type MarketingSpendChartProps = {
  data: MarketingDailyPoint[];
};

export function MarketingSpendChart({ data }: MarketingSpendChartProps) {
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No spend data for this period
      </p>
    );
  }

  const chartData = data.map((row) => ({
    date: row.date.slice(5),
    spend: row.spendCents / 100,
  }));

  return (
    <div className="h-72 w-full">
      <RechartsResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <RechartsCartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <RechartsXAxis dataKey="date" tick={{ fontSize: 12 }} />
          <RechartsYAxis tickFormatter={(v) => `$${v}`} width={56} />
          <RechartsTooltip
            formatter={(value) => [
              formatMarketingCurrency(Number(value) * 100),
              "Spend",
            ]}
          />
          <RechartsLine
            type="monotone"
            dataKey="spend"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </RechartsLineChart>
      </RechartsResponsiveContainer>
    </div>
  );
}
