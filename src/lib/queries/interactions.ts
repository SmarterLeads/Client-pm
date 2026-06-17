import {
  contactNameFromMap,
  loadContactNameMap,
} from "@/lib/interactions/contact-names";
import { mapInteractionDbRows } from "@/lib/interactions/attendees";
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
      contact_ids,
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
  const mapped = await mapInteractionDbRows(supabase, rows);

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

  return mapped.map((row) => ({
    ...row,
    client_id: row.client_id!,
    client_name: clientNameMap.get(row.client_id!) ?? "—",
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
      contact_ids,
      logged_by,
      logger:team_members(name)
    `,
    )
    .eq("id", interactionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const [mapped] = await mapInteractionDbRows(supabase, [data]);
  return mapped ?? null;
}
