import { formatContactName } from "@/lib/clients/contact-utils";
import type { AppSupabaseClient } from "@/lib/supabase/pm";

type ContactFields = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

export async function loadContactNameMap(
  supabase: AppSupabaseClient,
  contactIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(contactIds.filter(Boolean))];
  const map = new Map<string, string>();

  if (uniqueIds.length === 0) return map;

  const { data, error } = await supabase
    .from("client_contacts")
    .select("id, name, first_name, last_name, email")
    .in("id", uniqueIds);

  if (error) throw new Error(error.message);

  for (const contact of (data ?? []) as ContactFields[]) {
    map.set(contact.id, formatContactName(contact));
  }

  return map;
}

export function contactNameFromMap(
  contactId: string | null | undefined,
  map: Map<string, string>,
): string | null {
  if (!contactId) return null;
  return map.get(contactId) ?? null;
}
