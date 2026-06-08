"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HeroSeriesDatum } from "@/lib/queries/lead-gen-queries";

export type HeroChartMode = "conversions" | "traffic";

type Props = {
  data: HeroSeriesDatum[];
  mode: HeroChartMode;
  onModeChange: (next: HeroChartMode) => void;
};

const BLUE = "#4285F4";
const RED = "#EA4335";
const YELLOW = "#FBBC04";

export function ClientHeroChart({ data, mode, onModeChange }: Props) {
  const lines =
    mode === "conversions"
      ? [
          { key: "cost", label: "Cost", color: BLUE, axis: "currency" as const },
          { key: "conversions", label: "Conversions", color: RED, axis: "count" as const },
          {
            key: "costPerConversion",
            label: "Cost / Conversion",
            color: YELLOW,
            axis: "currency" as const,
          },
        ]
      : [
          { key: "impressions", label: "Impressions", color: BLUE, axis: "count" as const },
          { key: "clicks", label: "Clicks", color: RED, axis: "count" as const },
          { key: "cpc", label: "CPC", color: YELLOW, axis: "currency" as const },
        ];

  return (
    <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Performance trend (last 30 days)
          </h4>
        </div>
        <div className="inline-flex rounded-md border border-zinc-300 bg-white p-0.5 dark:border-zinc-600 dark:bg-zinc-800">
          <Toggle
            active={mode === "conversions"}
            onClick={() => onModeChange("conversions")}
            label="Conversions"
          />
          <Toggle active={mode === "traffic"} onClick={() => onModeChange("traffic")} label="Traffic" />
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="reportDate"
              tickFormatter={(value: string) => {
                const d = new Date(`${value}T00:00:00.000Z`);
                return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
              }}
              minTickGap={18}
              tick={{ fontSize: 11 }}
            />
            <YAxis yAxisId="count" tick={{ fontSize: 11 }} tickFormatter={(v: number) => short(v)} />
            <YAxis
              yAxisId="currency"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `$${short(v)}`}
            />
            <Tooltip content={<HeroTooltip mode={mode} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {lines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                yAxisId={line.axis}
                stroke={line.color}
                strokeWidth={2.5}
                dot={false}
                name={line.label}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium transition ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
      }`}
    >
      {label}
    </button>
  );
}

function HeroTooltip({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  mode: HeroChartMode;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-1 font-semibold text-zinc-700 dark:text-zinc-200">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">
            {p.name}
          </span>
          <span className="tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatValue(mode, p.name ?? "", Number(p.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatValue(mode: HeroChartMode, name: string, value: number) {
  const currencyNames =
    mode === "conversions" ? new Set(["Cost", "Cost / Conversion"]) : new Set(["CPC"]);
  if (currencyNames.has(name)) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return Math.round(value).toLocaleString("en-US");
}

function short(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}
