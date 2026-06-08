import type { KpiDatum } from "@/lib/marketing/lead-gen-types";

function formatKpiValue(item: KpiDatum): string {
  if (item.displayValue != null) return item.displayValue;
  const kind = item.metricType ?? "number";
  if (kind === "currency") {
    return item.value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (kind === "percent") {
    return `${item.value.toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`;
  }
  return item.value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

function deltaColorClass(item: KpiDatum): string {
  if (item.deltaPositive == null) {
    return "text-zinc-500 dark:text-zinc-400";
  }
  const favorable = item.deltaPositive;
  return favorable
    ? "text-emerald-600/85 dark:text-emerald-400/85"
    : "text-red-500/90 dark:text-red-400/90";
}

export function KpiCards({
  items,
  comparisonLabel,
}: {
  items: KpiDatum[];
  comparisonLabel?: string;
}) {
  const many = items.length > 6;
  return (
    <div className="overflow-x-auto pb-1">
      <div
        className={`grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 ${
          many ? "lg:grid-cols-4 xl:grid-cols-8" : "lg:grid-cols-7"
        }`}
      >
      {items.map((k) => (
        <div
          key={k.label}
          className="min-w-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {k.label}
          </p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatKpiValue(k)}
          </p>
          {k.delta ? (
            <p className={`mt-1 text-[10px] font-normal ${deltaColorClass(k)}`}>
              {k.delta}
            </p>
          ) : null}
          {comparisonLabel ? (
            <p className="mt-0.5 text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
              {comparisonLabel}
            </p>
          ) : null}
        </div>
      ))}
      </div>
    </div>
  );
}
