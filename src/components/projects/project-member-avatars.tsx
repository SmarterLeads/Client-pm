import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ProjectListMember } from "@/lib/queries/projects";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProjectMemberAvatars({
  members,
  max = 4,
}: {
  members: ProjectListMember[];
  max?: number;
}) {
  if (members.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((member) => (
        <Avatar
          key={member.id}
          size="sm"
          className="ring-2 ring-background"
          title={member.name}
        >
          {member.avatar_url ? (
            <AvatarImage src={member.avatar_url} alt="" />
          ) : null}
          <AvatarFallback>{initials(member.name)}</AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 ? (
        <span className="pl-3 text-xs text-muted-foreground">+{overflow}</span>
      ) : null}
    </div>
  );
}
