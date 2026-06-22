import type { ConversionBreakdownGroup } from "@/lib/marketing/lead-gen-types";

import { ConversionTypeBadge } from "@/components/marketing/conversion-type-badge";

type Props = {
  groups: ConversionBreakdownGroup[];
};

export function ConversionBreakdownTable({ groups }: Props) {
  const flatRows = groups
    .flatMap((g) => g.rows)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (flatRows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No active conversions configured for this platform.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-zinc-100 dark:bg-zinc-800/80">
          <tr className="text-[10px] uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
            <th className="px-3 py-2 font-semibold">Conversion Name</th>
            <th className="px-3 py-2 font-semibold text-right">This Period</th>
            <th className="px-3 py-2 font-semibold text-right">Prior Period</th>
            <th className="px-3 py-2 font-semibold text-right">Change %</th>
            <th className="px-3 py-2 font-semibold text-right">Cost/Conv.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-700 dark:bg-zinc-900">
          {flatRows.map((row) => {
            const sign = row.wowPct > 0 ? "+" : "";
            const wowClass =
              row.wowPct === 0
                ? "text-zinc-500 dark:text-zinc-400"
                : row.wowPct < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400";
            return (
              <tr key={row.id}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{row.displayName}</span>
                    <ConversionTypeBadge type={row.type} />
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                  {row.totalCount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {row.priorCount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${wowClass}`}>
                  {`${sign}${row.wowPct.toFixed(2)}%`}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                  {row.costPerConv > 0
                    ? row.costPerConv.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
