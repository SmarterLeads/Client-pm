import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500",
  prospect: "bg-blue-500",
  on_hold: "bg-zinc-400 dark:bg-zinc-500",
  churned: "bg-red-500",
  inactive: "bg-zinc-400 dark:bg-zinc-500",
};

export function ClientStatusDot({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const color =
    status && status in statusStyles
      ? statusStyles[status]
      : "bg-muted";

  return (
    <span
      className={cn("inline-block size-2.5 shrink-0 rounded-full", color, className)}
      aria-hidden
    />
  );
}
