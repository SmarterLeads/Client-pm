import { Badge } from "@/components/ui/badge";
import type { TeamMemberRole } from "@/lib/types";

const labels: Record<TeamMemberRole, string> = {
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  agency_contact: "Agency contact",
};

export function RoleBadge({ role }: { role: TeamMemberRole }) {
  return (
    <Badge variant="secondary" className="capitalize">
      {labels[role]}
    </Badge>
  );
}
