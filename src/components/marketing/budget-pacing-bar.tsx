type Props = {
  spent: number;
  cap: number;
  daysElapsed: number;
  totalDaysInMonth: number;
};

export function BudgetPacingBar({ spent, cap, daysElapsed, totalDaysInMonth }: Props) {
  const targetSpendCents =
    cap > 0 && totalDaysInMonth > 0 ? (cap * daysElapsed) / totalDaysInMonth : 0;
  const pacingPct = targetSpendCents > 0 ? (spent / targetSpendCents) * 100 : 0;
  const pct = Number.isFinite(pacingPct) ? pacingPct : 0;
  const fillClass =
    pct < 70 || pct > 130
      ? "bg-red-500"
      : pct < 85 || pct > 115
        ? "bg-amber-500"
        : "bg-emerald-500";
  const labelClass =
    pct < 70 || pct > 130
      ? "text-red-600 dark:text-red-400"
      : pct < 85 || pct > 115
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="w-full min-w-[100px] max-w-[140px]">
      <div className="mb-0.5 flex justify-between text-[10px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
        <span>Pacing</span>
        <span className={labelClass}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Budget pacing"
      >
        <div
          className={`h-full rounded-full transition-all ${fillClass}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
