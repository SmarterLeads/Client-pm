import type { ProjectListMember } from "@/lib/queries/projects";
import type { TeamMember } from "@/lib/types";

type MemberRow = {
  team_member?: Pick<TeamMember, "id" | "name" | "avatar_url"> | null;
};

export function safeMemberInitials(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";

  return trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function toProjectListMember(
  member: Pick<TeamMember, "id" | "name" | "avatar_url"> | null | undefined,
): ProjectListMember | null {
  if (!member?.id) return null;

  return {
    id: member.id,
    name: member.name?.trim() || "Unknown member",
    avatar_url: member.avatar_url ?? null,
  };
}

export function projectMemberRowsToListMembers(rows: MemberRow[]): ProjectListMember[] {
  return rows
    .map((row) => toProjectListMember(row.team_member))
    .filter((member): member is ProjectListMember => member !== null);
}

export function resolveProjectListMembers(
  rows: MemberRow[],
  legacyOwner?: ProjectListMember | null,
): ProjectListMember[] {
  const fromRows = projectMemberRowsToListMembers(rows);
  if (fromRows.length > 0) return fromRows;
  if (legacyOwner?.id) return [legacyOwner];
  return [];
}
