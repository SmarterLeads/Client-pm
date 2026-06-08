function formatWow(pct: number) {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function formatPrior(
  priorValue: number,
  kind: "count" | "currency" | "ratio",
) {
  if (kind === "currency") {
    return priorValue.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (kind === "ratio") {
    return `${priorValue.toFixed(2)}x`;
  }
  return priorValue.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function WowDelta({
  pct,
  priorValue,
  priorKind = "count",
  comparisonLabel,
}: {
  pct: number;
  priorValue?: number;
  priorKind?: "count" | "currency" | "ratio";
  comparisonLabel?: string;
}) {
  const positive = pct > 0;
  const neutral = pct === 0;
  const cls = neutral
    ? "text-zinc-500 dark:text-zinc-400"
    : positive
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  return (
    <span className="block">
      <span className={`text-[10px] font-normal tabular-nums opacity-90 ${cls}`}>
        {`${formatWow(pct)}${
          priorValue != null
            ? ` | Prev: ${formatPrior(priorValue, priorKind)}`
            : ""
        }`}
      </span>
      {comparisonLabel ? (
        <span className="mt-0.5 block text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
          {comparisonLabel}
        </span>
      ) : null}
    </span>
  );
}
