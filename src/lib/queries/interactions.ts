import {
  contactNameFromMap,
  loadContactNameMap,
} from "@/lib/interactions/contact-names";
import type {
  ClientSelectOption,
  GlobalInteractionRow,
  InteractionListFilters,
} from "@/lib/interactions/types";

export type { ClientSelectOption } from "@/lib/interactions/types";
import type { InteractionRow } from "@/lib/interactions/types";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";

function startOfDay(isoDate: string) {
  const d = new Date(isoDate);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDay(isoDate: string) {
  const d = new Date(isoDate);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export async function getClientsForInteractionFilter(): Promise<
  ClientSelectOption[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).filter(
    (row): row is ClientSelectOption => Boolean(row.id && row.name),
  );
}

export async function getAllInteractions(
  filters: InteractionListFilters = {},
): Promise<GlobalInteractionRow[]> {
  const supabase = await createClient();

  let query = pm(supabase)
    .from("interactions")
    .select(
      `
      id,
      type,
      channel,
      summary,
      body,
      occurred_at,
      client_id,
      contact_id,
      logged_by,
      logger:team_members(name)
    `,
    )
    .order("occurred_at", { ascending: false });

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.client_id) {
    query = query.eq("client_id", filters.client_id);
  }

  if (filters.from) {
    query = query.gte("occurred_at", startOfDay(filters.from));
  }

  if (filters.to) {
    query = query.lte("occurred_at", endOfDay(filters.to));
  }

  if (filters.q?.trim()) {
    query = query.ilike("summary", `%${filters.q.trim()}%`);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter(
    (row): row is typeof row & { id: string; client_id: string } =>
      Boolean(row.id && row.client_id),
  );

  const clientIds = [...new Set(rows.map((row) => row.client_id))];
  const contactMap = await loadContactNameMap(
    supabase,
    rows.map((row) => row.contact_id).filter((id): id is string => Boolean(id)),
  );

  const clientNameMap = new Map<string, string>();
  if (clientIds.length > 0) {
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name")
      .in("id", clientIds);

    if (clientsError) throw new Error(clientsError.message);

    for (const client of clients ?? []) {
      if (client.id && client.name) {
        clientNameMap.set(client.id, client.name);
      }
    }
  }

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    channel: row.channel,
    summary: row.summary,
    body: row.body,
    occurred_at: row.occurred_at,
    logged_by: row.logged_by,
    logged_by_name: row.logger?.name ?? null,
    contact_id: row.contact_id,
    contact_name: contactNameFromMap(row.contact_id, contactMap),
    client_id: row.client_id,
    client_name: clientNameMap.get(row.client_id) ?? "—",
  }));
}

export async function getInteractionById(
  interactionId: string,
): Promise<InteractionRow | null> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("interactions")
    .select(
      `
      id,
      type,
      channel,
      summary,
      body,
      occurred_at,
      contact_id,
      logged_by,
      logger:team_members(name)
    `,
    )
    .eq("id", interactionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const contactMap = await loadContactNameMap(
    supabase,
    data.contact_id ? [data.contact_id] : [],
  );

  return {
    id: data.id,
    type: data.type,
    channel: data.channel,
    summary: data.summary,
    body: data.body,
    occurred_at: data.occurred_at,
    logged_by: data.logged_by,
    logged_by_name: data.logger?.name ?? null,
    contact_id: data.contact_id,
    contact_name: contactNameFromMap(data.contact_id, contactMap),
  };
}
