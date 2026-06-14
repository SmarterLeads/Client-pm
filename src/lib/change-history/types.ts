import type { ChangeAction, Json } from "@/lib/types";

export type ChangeHistoryRow = {
  id: string;
  action: ChangeAction;
  entity_type: string;
  entity_id: string;
  changed_at: string;
  changed_by_name: string | null;
  old_values: Json | null;
  new_values: Json | null;
};

export type ChangeHistoryDiff = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export type GlobalChangeHistoryFilters = {
  entity_type?: string;
  changed_by?: string;
};

export type ChangeHistoryPageResult = {
  entries: ChangeHistoryRow[];
  totalCount: number;
  hasMore: boolean;
};

export const DEFAULT_CHANGE_HISTORY_PAGE_SIZE = 25;
