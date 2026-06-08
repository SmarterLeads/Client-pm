import { cn } from "@/lib/utils";

export function TaskProgressBar({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full bg-primary transition-all")}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}
