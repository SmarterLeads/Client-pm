import type { AppSupabaseClient } from "@/lib/supabase/pm";

export async function loadClientNameMap(
  supabase: AppSupabaseClient,
  clientIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(clientIds.filter(Boolean))];
  const map = new Map<string, string>();

  if (uniqueIds.length === 0) return map;

  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .in("id", uniqueIds);

  if (error) throw new Error(error.message);

  for (const client of data ?? []) {
    if (client.id && client.name) {
      map.set(client.id, client.name);
    }
  }

  return map;
}

export function clientNameFromMap(
  clientId: string | null | undefined,
  map: Map<string, string>,
): string {
  if (!clientId) return "—";
  return map.get(clientId) ?? "—";
}
