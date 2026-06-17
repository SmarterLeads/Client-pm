import { contactNameFromMap, loadContactNameMap } from "@/lib/interactions/contact-names";
import type {
  InteractionAttendeeRow,
  InteractionContactRef,
  InteractionRow,
} from "@/lib/interactions/types";
import { pm, type AppSupabaseClient } from "@/lib/supabase/pm";

type InteractionDbRow = {
  id: string;
  type: InteractionRow["type"];
  channel: InteractionRow["channel"];
  summary: string;
  body: string | null;
  occurred_at: string;
  contact_id: string | null;
  contact_ids?: string[] | null;
  logged_by: string | null;
  logger?: { name: string | null } | null;
  client_id?: string;
};

export function resolveInteractionContactIds(row: {
  contact_id: string | null;
  contact_ids?: string[] | null;
}): string[] {
  if (row.contact_ids?.length) return row.contact_ids;
  if (row.contact_id) return [row.contact_id];
  return [];
}

export async function loadInteractionAttendeesMap(
  supabase: AppSupabaseClient,
  interactionIds: string[],
): Promise<Map<string, InteractionAttendeeRow[]>> {
  const map = new Map<string, InteractionAttendeeRow[]>();
  const uniqueIds = [...new Set(interactionIds.filter(Boolean))];

  if (uniqueIds.length === 0) return map;

  const { data, error } = await pm(supabase)
    .from("interaction_attendees")
    .select("id, interaction_id, name, email, company")
    .in("interaction_id", uniqueIds)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const attendee: InteractionAttendeeRow = {
      id: row.id,
      name: row.name,
      email: row.email,
      company: row.company,
    };
    const existing = map.get(row.interaction_id) ?? [];
    existing.push(attendee);
    map.set(row.interaction_id, existing);
  }

  return map;
}

export async function mapInteractionDbRows(
  supabase: AppSupabaseClient,
  rows: InteractionDbRow[],
): Promise<InteractionRow[]> {
  if (rows.length === 0) return [];

  const contactIds = new Set<string>();
  for (const row of rows) {
    for (const id of resolveInteractionContactIds(row)) {
      contactIds.add(id);
    }
  }

  const [contactMap, attendeeMap] = await Promise.all([
    loadContactNameMap(supabase, [...contactIds]),
    loadInteractionAttendeesMap(
      supabase,
      rows.map((row) => row.id),
    ),
  ]);

  return rows.map((row) => {
    const contact_ids = resolveInteractionContactIds(row);
    const contacts: InteractionContactRef[] = contact_ids
      .map((id) => ({
        id,
        name: contactNameFromMap(id, contactMap) ?? "Unknown contact",
      }))
      .filter((contact) => Boolean(contact.name));

    return {
      id: row.id,
      type: row.type,
      channel: row.channel,
      summary: row.summary,
      body: row.body,
      occurred_at: row.occurred_at,
      logged_by: row.logged_by,
      logged_by_name: row.logger?.name ?? null,
      client_id: row.client_id,
      contact_id: row.contact_id,
      contact_name:
        contacts[0]?.name ?? contactNameFromMap(row.contact_id, contactMap),
      contact_ids,
      contacts,
      attendees: attendeeMap.get(row.id) ?? [],
    };
  });
}
