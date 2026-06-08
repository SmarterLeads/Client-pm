import { Badge } from "@/components/ui/badge";
import type { AccessLevel } from "@/lib/types";

const labels: Record<AccessLevel, string> = {
  viewer: "Viewer",
  approver: "Approver",
  collaborator: "Collaborator",
};

export function PortalAccessLevelBadge({
  accessLevel,
}: {
  accessLevel: AccessLevel;
}) {
  return <Badge variant="secondary">{labels[accessLevel]}</Badge>;
}
