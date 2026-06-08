import { Badge } from "@/components/ui/badge";
import type { ClientStatus } from "@/lib/pm/constants";

const statusLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  prospect: "Lead",
  on_hold: "Paused",
  churned: "Churned",
};

function statusVariant(status: string) {
  if (status === "active") return "default" as const;
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
    status in statusLabels
      ? statusLabels[status as ClientStatus]
      : status;

  return (
    <Badge
      variant={statusVariant(status)}
      className={
        status === "on_hold"
          ? "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          : undefined
      }
    >
      {label}
    </Badge>
  );
}
