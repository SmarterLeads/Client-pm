import type { TeamMemberRole } from "@/lib/types";

export type { TeamMemberRole };

/** Admins and managers can toggle availability and bulk-reassign tasks. */
export function canManageTeam(role: TeamMemberRole): boolean {
  return role === "admin" || role === "manager";
}

export function isAdmin(role: TeamMemberRole): boolean {
  return role === "admin";
}
