import { Badge } from "@/components/ui/badge";

export function AgencyBadge({
  name,
  compact = false,
}: {
  name: string | null;
  compact?: boolean;
}) {
  if (!name) return null;

  return (
    <Badge
      variant="outline"
      className={compact ? "px-1.5 py-0 text-[10px] font-normal" : "font-normal"}
    >
      {name}
    </Badge>
  );
}
