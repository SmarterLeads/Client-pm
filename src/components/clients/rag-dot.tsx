import { cn } from "@/lib/utils";
import type { RagStatus } from "@/lib/types";

const ragStyles: Record<RagStatus, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function RagDot({
  status,
  className,
}: {
  status: RagStatus | null | undefined;
  className?: string;
}) {
  if (!status) {
    return (
      <span
        className={cn("inline-block size-2.5 rounded-full bg-muted", className)}
        aria-hidden
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn("size-2.5 shrink-0 rounded-full", ragStyles[status], className)}
        aria-hidden
      />
      <span className="sr-only">RAG {status}</span>
    </span>
  );
}
