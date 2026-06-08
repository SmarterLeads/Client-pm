"use client";

import { useEffect, useMemo, useState } from "react";

import { scalePow } from "d3-scale";
import type { TooltipContentProps } from "recharts";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BLUE = "#4285F4";
const RED = "#EA4335";
const YELLOW = "#FBBC04";

const TICK_STYLE = { fill: "#A1A1AA", fontSize: 11 };

export type ReportChartMode = "conversions" | "traffic";

export type ReportSeriesPoint = {
  /** ISO date YYYY-MM-DD (UTC) — used as X-axis key */
  date: string;
  cost: number;
  conversions: number;
  cpl: number;
  impressions: number;
  clicks: number;
  cpc: number;
};

type ChartLineKey = Exclude<keyof ReportSeriesPoint, "date">;

type ChartLineCfg = {
  key: ChartLineKey;
  label: string;
  stroke: string;
  yAxisId: "left" | "right";
};

type Props = {
  /** When omitted, no heading is shown (use a page-level section title instead). */
  title?: string;
  primaryColor: string;
  data: ReportSeriesPoint[];
  /** Server-driven default (client `default_chart_mode`). Client can still toggle. */
  initialChartMode?: ReportChartMode;
};

export function PerformanceLineChart({ title, primaryColor, data, initialChartMode }: Props) {
  const showTitle = Boolean(title?.trim());
  const [mode, setMode] = useState<ReportChartMode>(initialChartMode ?? "conversions");
  const [isolatedKey, setIsolatedKey] = useState<ChartLineKey | null>(null);

  useEffect(() => {
    setMode(initialChartMode ?? "conversions");
  }, [initialChartMode]);

  const lines: ChartLineCfg[] = useMemo(() => {
    if (mode === "conversions") {
      return [
        { key: "cost", label: "Cost", stroke: BLUE, yAxisId: "left" },
        {
          key: "conversions",
          label: "Conversions",
          stroke: RED,
          yAxisId: "right",
        },
        { key: "cpl", label: "CPL", stroke: YELLOW, yAxisId: "right" },
      ];
    }
    return [
      { key: "impressions", label: "Impressions", stroke: BLUE, yAxisId: "left" },
      { key: "clicks", label: "Clicks", stroke: RED, yAxisId: "left" },
      { key: "cpc", label: "CPC", stroke: YELLOW, yAxisId: "right" },
    ];
  }, [mode]);

  const legendItems = lines.map((l) => ({
    key: l.key,
    color: l.stroke,
    label: l.label,
  }));

  const leftAxisDomain =
    mode === "traffic"
      ? ([
          (min: number) => Math.max(0, min * 0.8),
          (max: number) => Math.max(1, max * 1.2),
        ] as const)
      : ([(min: number) => min * 0.8, (max: number) => max * 1.2] as const);
  const rightAxisDomain = [(min: number) => min * 0.8, (max: number) => max * 1.2] as const;
  const effectiveIsolatedKey =
    isolatedKey && lines.some((l) => l.key === isolatedKey) ? isolatedKey : null;
  const trafficLeftScale = useMemo(() => scalePow().exponent(0.30), []);

  return (
    <div>
      <div
        className={`mb-4 flex flex-wrap items-center gap-3 ${showTitle ? "justify-between" : "justify-end"}`}
      >
        {showTitle ? <h2 className="text-base font-semibold text-zinc-900">{title}</h2> : null}
        <div className="inline-flex gap-0.5 rounded-full border border-zinc-300 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setMode("conversions")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              mode === "conversions"
                ? "text-white shadow-sm"
                : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
            style={
              mode === "conversions"
                ? {
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                  }
                : undefined
            }
          >
            Conversions
          </button>
          <button
            type="button"
            onClick={() => setMode("traffic")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              mode === "traffic"
                ? "text-white shadow-sm"
                : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
            style={
              mode === "traffic"
                ? {
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                  }
                : undefined
            }
          >
            Traffic
          </button>
        </div>
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 52, left: 52, bottom: 8 }}>
            <CartesianGrid
              vertical={false}
              stroke="#e4e4e7"
              strokeDasharray="3 6"
              horizontal
            />
            <XAxis
              dataKey="date"
              tick={TICK_STYLE}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickFormatter={formatXAxisTick}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              scale={mode === "traffic" ? trafficLeftScale : "auto"}
              domain={leftAxisDomain}
              axisLine={false}
              tickLine={false}
              width={52}
              tick={TICK_STYLE}
              tickFormatter={(v: number) =>
                mode === "conversions" ? formatUsdAxisShort(v) : formatImpressionsK(v)
              }
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={rightAxisDomain}
              axisLine={false}
              tickLine={false}
              width={52}
              tick={TICK_STYLE}
              tickFormatter={(v: number) =>
                mode === "conversions" ? formatConversionInteger(v) : formatTrafficRightTick(v)
              }
            />
            <Tooltip content={(props) => <ReportPerformanceTooltip {...props} mode={mode} />} />
            {lines.map((line) => (
              <Line
                key={line.key}
                yAxisId={line.yAxisId}
                type="monotone"
                dataKey={line.key}
                name={line.label}
                stroke={line.stroke}
                strokeWidth={2.5}
                strokeOpacity={effectiveIsolatedKey == null || effectiveIsolatedKey === line.key ? 1 : 0.2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-zinc-600">
        {legendItems.map((item) => (
          <ChartLegendSample
            key={item.key}
            color={item.color}
            label={item.label}
            active={effectiveIsolatedKey === item.key}
            faded={effectiveIsolatedKey != null && effectiveIsolatedKey !== item.key}
            onClick={() =>
              setIsolatedKey((prev) => (prev === item.key ? null : item.key))
            }
          />
        ))}
      </div>
    </div>
  );
}

function formatXAxisTick(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Left axis — conversion mode: USD with abbreviated thousands/millions; small amounts as currency. */
function formatUsdAxisShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000)
    return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 100) return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: abs % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Left axis — traffic mode: impression counts with K/M suffix */
function formatImpressionsK(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10 ? 1 : 2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(abs >= 10_000 ? 1 : 1)}K`;
  return `${sign}${Math.round(abs).toLocaleString("en-US")}`;
}

/** Right axis — conversion mode */
function formatConversionInteger(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** Right axis — traffic (clicks + CPC share axis): ints as comma counts; small / fractional values as USD */
function formatTrafficRightTick(value: number): string {
  if (value <= 0) return Math.round(value).toLocaleString("en-US");
  if (!Number.isInteger(value) || value < 10) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return Math.round(value).toLocaleString("en-US");
}

function ChartLegendSample({
  color,
  label,
  active,
  faded,
  onClick,
}: {
  color: string;
  label: string;
  active: boolean;
  faded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 transition-transform duration-150 hover:cursor-pointer ${
        active ? "scale-[1.03]" : ""
      } ${faded ? "opacity-20" : "opacity-100"}`}
    >
      <span
        aria-hidden
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </button>
  );
}

function ReportPerformanceTooltip(props: TooltipContentProps & { mode: ReportChartMode }) {
  const { active, payload, label, mode } = props;
  if (!active || !payload?.length) return null;
  const dayLabel =
    typeof label === "string" && /^\d{4}-\d{2}-\d{2}$/.test(label.trim())
      ? formatXAxisTick(label.trim())
      : label;
  return (
    <div className="rounded-[10px] border border-zinc-200 bg-white px-3 py-2 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      {dayLabel != null && dayLabel !== "" ? (
        <div className="mb-2 font-semibold text-zinc-700">{dayLabel}</div>
      ) : null}
      {payload.map((p) => (
        <div key={String(p.name)} className="flex items-center justify-between gap-6">
          <span style={{ color: p.color }} className="font-medium">
            {p.name}
          </span>
          <span className="tabular-nums text-zinc-900">
            {formatReportTooltip(mode, String(p.name ?? ""), coerceTooltipNumber(p.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

function coerceTooltipNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value) || 0;
  if (Array.isArray(value) && value.length > 0) return coerceTooltipNumber(value[0]);
  return Number(value ?? 0) || 0;
}

function formatUsdTooltip(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompactUsdLarge(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000)
    return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  return formatUsdTooltip(value);
}

function formatReportTooltip(mode: ReportChartMode, name: string, value: number) {
  if (mode === "conversions") {
    if (name === "Cost") return formatCompactUsdLarge(value);
    if (name === "Cost per Conversion" || name === "CPL") return formatUsdTooltip(value);
    return Math.round(value).toLocaleString("en-US");
  }

  /* traffic */
  if (name === "Impressions") {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return Math.round(value).toLocaleString("en-US");
  }
  if (name === "CPC") return formatUsdTooltip(value);
  return Math.round(value).toLocaleString("en-US");
}

