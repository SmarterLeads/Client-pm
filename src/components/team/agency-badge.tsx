import { Badge } from "@/components/ui/badge";

export function AgencyBadge({ name }: { name: string | null }) {
  if (!name) return null;

  return (
    <Badge variant="outline" className="font-normal">
      {name}
    </Badge>
  );
}
