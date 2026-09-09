import { Badge } from "@/components/ui/badge";
import {
  CLIENT_STATUS_LABELS,
  type ClientStatus,
} from "@/lib/pm/constants";

function statusVariant(status: string) {
  if (status === "active") return "default" as const;
  if (status === "setup") return "secondary" as const;
  if (status === "prospect") return "secondary" as const;
  if (status === "on_hold") return "outline" as const;
  if (status === "churned") return "destructive" as const;
  return "outline" as const;
}

export function StatusBadge({
  status,
}: {
  status: ClientStatus | string | null | undefined;
}) {
  if (!status) {
    return <Badge variant="outline">Unknown</Badge>;
  }

  const label =
    status in CLIENT_STATUS_LABELS
      ? CLIENT_STATUS_LABELS[status as ClientStatus]
      : status;

  return (
    <Badge
      variant={statusVariant(status)}
      className={
        status === "setup"
          ? "border-teal-300 bg-teal-100 text-teal-800 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-300"
          : status === "on_hold"
            ? "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            : undefined
      }
    >
      {label}
    </Badge>
  );
}
