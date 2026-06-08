import type { ConversionType } from "@/lib/marketing/lead-gen-types";

const styles: Record<
  ConversionType,
  string
> = {
  lead:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
  opportunity:
    "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
  purchase:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  custom:
    "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200",
  other:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100",
};

export function ConversionTypeBadge({ type }: { type: ConversionType }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[type]}`}
    >
      {type}
    </span>
  );
}
