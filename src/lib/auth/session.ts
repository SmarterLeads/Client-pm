import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import type { UserPersona } from "@/lib/auth/types";
import type { ClientUser, TeamMember } from "@/lib/types";

export type { UserPersona } from "@/lib/auth/types";
export type { TeamMemberRole } from "@/lib/auth/roles";
export { canManageTeam } from "@/lib/auth/roles";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function getTeamMember(): Promise<TeamMember | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data: byAuth, error: byAuthError } = await pm(supabase)
    .from("team_members")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuthError) return null;
  if (byAuth) return byAuth;

  if (!user.email) return null;

  const { data: byEmail, error: byEmailError } = await pm(supabase)
    .from("team_members")
    .select("*")
    .ilike("email", user.email)
    .maybeSingle();

  if (byEmailError || !byEmail) return null;
  return byEmail;
}

export async function getClientUser(): Promise<ClientUser | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("client_portal_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function getCurrentProfile(persona: UserPersona) {
  return persona === "portal" ? getClientUser() : getTeamMember();
}

export async function getUnreadNotificationCount(
  teamMemberId: string,
): Promise<number> {
  if (!teamMemberId) return 0;

  try {
    const supabase = await createClient();
    const { count, error } = await pm(supabase)
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", teamMemberId)
      .eq("read", false);

    if (error) {
      console.error("getUnreadNotificationCount:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error(
      "getUnreadNotificationCount:",
      err instanceof Error ? err.message : err,
    );
    return 0;
  }
}

export type PortalSession = {
  clientUser: ClientUser;
  client: {
    id: string;
    name: string;
  };
};

export async function getPortalSession(): Promise<PortalSession | null> {
  const clientUser = await getClientUser();
  if (!clientUser) return null;

  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientUser.client_id)
    .single();

  if (error || !client) return null;

  return { clientUser, client };
}
