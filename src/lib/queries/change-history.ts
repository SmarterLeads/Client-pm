import type {
  ChangeHistoryRow,
  GlobalChangeHistoryFilters,
} from "@/lib/change-history/types";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";

const HISTORY_SELECT = `
  id,
  action,
  entity_type,
  entity_id,
  changed_at,
  old_values,
  new_values,
  changer:team_members(name)
`;

function mapHistoryRows(
  data: Array<{
    id: string;
    action: ChangeHistoryRow["action"];
    entity_type: string;
    entity_id: string;
    changed_at: string;
    old_values: ChangeHistoryRow["old_values"];
    new_values: ChangeHistoryRow["new_values"];
    changer: { name: string } | null;
  }> | null,
): ChangeHistoryRow[] {
  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    changed_at: row.changed_at,
    changed_by_name: row.changer?.name ?? null,
    old_values: row.old_values,
    new_values: row.new_values,
  }));
}

export async function getChangeHistoryForEntity(
  entityType: string,
  entityId: string,
): Promise<ChangeHistoryRow[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("change_history")
    .select(HISTORY_SELECT)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("changed_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return mapHistoryRows(data);
}

export async function getGlobalChangeHistory(
  filters: GlobalChangeHistoryFilters = {},
): Promise<ChangeHistoryRow[]> {
  const supabase = await createClient();

  let query = pm(supabase)
    .from("change_history")
    .select(HISTORY_SELECT)
    .order("changed_at", { ascending: false })
    .limit(100);

  if (filters.entity_type) {
    query = query.eq("entity_type", filters.entity_type);
  }

  if (filters.changed_by) {
    query = query.eq("changed_by", filters.changed_by);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return mapHistoryRows(data);
}

export async function getChangeHistoryEntityTypes(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("change_history")
    .select("entity_type")
    .order("entity_type")
    .limit(500);

  if (error) throw new Error(error.message);

  const types = new Set<string>();
  for (const row of data ?? []) {
    if (row.entity_type) types.add(row.entity_type);
  }
  return Array.from(types).sort();
}
