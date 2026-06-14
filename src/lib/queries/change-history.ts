import type {
  ChangeHistoryPageResult,
  ChangeHistoryRow,
  GlobalChangeHistoryFilters,
} from "@/lib/change-history/types";
import { DEFAULT_CHANGE_HISTORY_PAGE_SIZE } from "@/lib/change-history/types";
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

function applyGlobalChangeHistoryFilters<
  T extends {
    eq: (column: string, value: string) => T;
  },
>(query: T, filters: GlobalChangeHistoryFilters): T {
  let next = query;

  if (filters.entity_type) {
    next = next.eq("entity_type", filters.entity_type);
  }

  if (filters.changed_by) {
    next = next.eq("changed_by", filters.changed_by);
  }

  return next;
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
    .order("changed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return mapHistoryRows(data);
}

export async function getChangeHistory(
  filters: GlobalChangeHistoryFilters = {},
  page = 0,
  pageSize = DEFAULT_CHANGE_HISTORY_PAGE_SIZE,
): Promise<ChangeHistoryPageResult> {
  const supabase = await createClient();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let countQuery = pm(supabase)
    .from("change_history")
    .select("*", { count: "exact", head: true });

  countQuery = applyGlobalChangeHistoryFilters(countQuery, filters);

  let dataQuery = pm(supabase)
    .from("change_history")
    .select(HISTORY_SELECT)
    .order("changed_at", { ascending: false })
    .range(from, to);

  dataQuery = applyGlobalChangeHistoryFilters(dataQuery, filters);

  const [{ count, error: countError }, { data, error: dataError }] =
    await Promise.all([countQuery, dataQuery]);

  if (countError) throw new Error(countError.message);
  if (dataError) throw new Error(dataError.message);

  const totalCount = count ?? 0;
  const entries = mapHistoryRows(data);

  return {
    entries,
    totalCount,
    hasMore: from + entries.length < totalCount,
  };
}

/** @deprecated Use getChangeHistory instead. */
export async function getGlobalChangeHistory(
  filters: GlobalChangeHistoryFilters = {},
): Promise<ChangeHistoryRow[]> {
  const result = await getChangeHistory(filters, 0, DEFAULT_CHANGE_HISTORY_PAGE_SIZE);
  return result.entries;
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

export type { ChangeHistoryPageResult };
