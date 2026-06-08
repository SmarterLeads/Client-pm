import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import type { TeamMemberRole } from "@/lib/types";

export type TeamMemberSettingsRow = {
  id: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  is_active: boolean;
  is_available: boolean;
  agency_id: string | null;
  agency_name: string | null;
};

export async function getTeamMembersForSettings(): Promise<
  TeamMemberSettingsRow[]
> {
  const supabase = await createClient();

  const { data: members, error } = await pm(supabase)
    .from("team_members")
    .select("id, name, email, role, is_active, is_available, agency_id")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  const agencyIds = [
    ...new Set(
      (members ?? [])
        .map((member) => member.agency_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const agencyNameById = new Map<string, string>();

  if (agencyIds.length > 0) {
    const { data: agencies, error: agenciesError } = await supabase
      .from("agencies")
      .select("id, name")
      .in("id", agencyIds);

    if (agenciesError) throw new Error(agenciesError.message);

    for (const agency of agencies ?? []) {
      agencyNameById.set(agency.id, agency.name);
    }
  }

  return (members ?? []).map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    is_active: member.is_active,
    is_available: member.is_available,
    agency_id: member.agency_id,
    agency_name: member.agency_id
      ? (agencyNameById.get(member.agency_id) ?? null)
      : null,
  }));
}
