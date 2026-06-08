"use client";

import {
  RechartsBar,
  RechartsBarChart,
  RechartsCartesianGrid,
  RechartsLegend,
  RechartsResponsiveContainer,
  RechartsTooltip,
  RechartsXAxis,
  RechartsYAxis,
} from "@/components/marketing/recharts-dynamic";
import { formatMarketingCurrency, formatPlatformLabel } from "@/lib/marketing/format";
import type { MarketingPlatformRow } from "@/lib/marketing/types";

type MarketingPlatformChartProps = {
  data: MarketingPlatformRow[];
};

export function MarketingPlatformChart({ data }: MarketingPlatformChartProps) {
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No platform performance data for this period
      </p>
    );
  }

  const chartData = data.map((row) => ({
    platform: formatPlatformLabel(row.platform),
    spend: row.spendCents / 100,
    conversions: row.conversions,
  }));

  return (
    <div className="h-80 w-full">
      <RechartsResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <RechartsCartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <RechartsXAxis dataKey="platform" tick={{ fontSize: 12 }} />
          <RechartsYAxis yAxisId="spend" tickFormatter={(v) => `$${v}`} width={56} />
          <RechartsYAxis
            yAxisId="conversions"
            orientation="right"
            width={48}
            tickFormatter={(v) => `${v}`}
          />
          <RechartsTooltip
            formatter={(value, name) => {
              if (name === "spend") {
                return [formatMarketingCurrency(Number(value) * 100), "Spend"];
              }
              return [value, "Conversions"];
            }}
          />
          <RechartsLegend />
          <RechartsBar
            yAxisId="spend"
            dataKey="spend"
            name="Spend"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
          <RechartsBar
            yAxisId="conversions"
            dataKey="conversions"
            name="Conversions"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </RechartsResponsiveContainer>
    </div>
  );
}
