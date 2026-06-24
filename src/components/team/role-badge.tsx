import { Badge } from "@/components/ui/badge";
import type { TeamMemberRole } from "@/lib/types";

const labels: Record<TeamMemberRole, string> = {
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  agency_contact: "Agency contact",
};

export function RoleBadge({
  role,
  compact = false,
}: {
  role: TeamMemberRole;
  compact?: boolean;
}) {
  return (
    <Badge
      variant="secondary"
      className={compact ? "px-1.5 py-0 text-[10px] capitalize" : "capitalize"}
    >
      {labels[role]}
    </Badge>
  );
}
