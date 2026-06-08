import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import type { ClientUpdateFilters, ClientUpdateRow } from "@/lib/updates/types";

function startOfDay(isoDate: string) {
  return `${isoDate}T00:00:00.000Z`;
}

function endOfDay(isoDate: string) {
  return `${isoDate}T23:59:59.999Z`;
}

export async function getClientUpdates(
  clientId: string,
  filters: ClientUpdateFilters = {},
): Promise<ClientUpdateRow[]> {
  const supabase = await createClient();

  let query = pm(supabase)
    .from("client_updates")
    .select("id, marketing_channel, summary, occurred_at, logged_by")
    .eq("client_id", clientId)
    .order("occurred_at", { ascending: false });

  if (filters.from) {
    query = query.gte("occurred_at", startOfDay(filters.from));
  }

  if (filters.to) {
    query = query.lte("occurred_at", endOfDay(filters.to));
  }

  if (filters.channel) {
    query = query.eq("marketing_channel", filters.channel);
  }

  if (filters.loggedBy) {
    query = query.eq("logged_by", filters.loggedBy);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getClientUpdates]", error.message);
    return [];
  }

  const rows = data ?? [];
  const loggerIds = [
    ...new Set(
      rows.map((row) => row.logged_by).filter((id): id is string => Boolean(id)),
    ),
  ];

  const loggerNames = new Map<string, string>();
  if (loggerIds.length > 0) {
    const { data: loggers } = await pm(supabase)
      .from("team_members")
      .select("id, name")
      .in("id", loggerIds);

    for (const logger of loggers ?? []) {
      loggerNames.set(logger.id, logger.name);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    marketing_channel: row.marketing_channel,
    summary: row.summary,
    occurred_at: row.occurred_at,
    logged_by: row.logged_by,
    logged_by_name: row.logged_by
      ? (loggerNames.get(row.logged_by) ?? null)
      : null,
  }));
}

export async function getClientUpdateFilterChannels(
  clientId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("client_updates")
    .select("marketing_channel")
    .eq("client_id", clientId);

  if (error) {
    console.error("[getClientUpdateFilterChannels]", error.message);
    return [];
  }

  return [...new Set((data ?? []).map((row) => row.marketing_channel))].sort();
}
