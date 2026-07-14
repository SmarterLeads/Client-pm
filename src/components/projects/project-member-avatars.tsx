import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ProjectListMember } from "@/lib/queries/projects";
import { safeMemberInitials } from "@/lib/projects/members";

export function ProjectMemberAvatars({
  members,
  max = 4,
  emptyLabel = "No members assigned",
}: {
  members?: ProjectListMember[] | null;
  max?: number;
  emptyLabel?: string;
}) {
  const safeMembers = (members ?? []).filter((member) => Boolean(member?.id));

  if (safeMembers.length === 0) {
    return (
      <span className="text-muted-foreground italic">{emptyLabel}</span>
    );
  }

  const visible = safeMembers.slice(0, max);
  const overflow = safeMembers.length - visible.length;

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
          <AvatarFallback>{safeMemberInitials(member.name)}</AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 ? (
        <span className="pl-3 text-xs text-muted-foreground">+{overflow}</span>
      ) : null}
    </div>
  );
}
