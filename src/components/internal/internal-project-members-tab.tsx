import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { InternalProjectMemberRow } from "@/lib/queries/internal";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function InternalProjectMembersTab({
  members,
}: {
  members: InternalProjectMemberRow[];
}) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No members yet.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {members.map((member) => (
        <li
          key={member.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              {member.team_member.avatar_url ? (
                <AvatarImage src={member.team_member.avatar_url} alt="" />
              ) : null}
              <AvatarFallback>
                {initials(member.team_member.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{member.team_member.name}</p>
              <p className="text-sm text-muted-foreground">
                {member.team_member.email}
              </p>
            </div>
            <Badge variant="secondary">
              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
