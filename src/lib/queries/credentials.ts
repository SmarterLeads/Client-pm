import { canViewClientCredentials } from "@/lib/credentials/access";
import type {
  ClientCredentialRow,
  ClientCredentialsResult,
} from "@/lib/credentials/types";
import { getTeamMember } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";

type CredentialDbRow = {
  id: string;
  client_id: string;
  platform: string;
  url: string | null;
  username: string | null;
  password: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator: { name: string } | { name: string }[] | null;
};

export async function getClientCredentials(
  clientId: string,
  accountManagerId: string | null,
): Promise<ClientCredentialsResult> {
  const teamMember = await getTeamMember();
  const canView = canViewClientCredentials(
    accountManagerId,
    teamMember?.id ?? null,
    teamMember ? isAdmin(teamMember.role) : false,
  );

  if (!canView) {
    return { canView: false, credentials: [] };
  }

  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("client_credentials")
    .select(
      `
      id,
      client_id,
      platform,
      url,
      username,
      password,
      notes,
      created_by,
      created_at,
      updated_at,
      creator:team_members!client_credentials_created_by_fkey(name)
    `,
    )
    .eq("client_id", clientId)
    .order("platform", { ascending: true });

  if (error) {
    console.error("[getClientCredentials]", error.message);
    return { canView: true, credentials: [] };
  }

  const credentials = ((data ?? []) as unknown as CredentialDbRow[]).map(
    (row): ClientCredentialRow => ({
      id: row.id,
      client_id: row.client_id,
      platform: row.platform,
      url: row.url,
      username: row.username,
      password: row.password,
      notes: row.notes,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by_name: Array.isArray(row.creator)
        ? (row.creator[0]?.name ?? null)
        : (row.creator?.name ?? null),
    }),
  );

  return { canView: true, credentials };
}
