import type { ChangeHistoryDiff } from "@/lib/change-history/types";
import type { Json } from "@/lib/types/database";

const SKIP_DIFF_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "changed_at",
]);

export function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "empty";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function formatFieldLabel(field: string) {
  return field.replace(/_/g, " ");
}

export function formatAbsoluteTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 45) return "just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}w ago`;

  return formatAbsoluteTime(iso);
}

export function getChangeDiffs(
  action: "insert" | "update" | "delete",
  oldValues: Json | null,
  newValues: Json | null,
): ChangeHistoryDiff[] {
  if (action !== "update") {
    return [];
  }

  const oldRecord =
    oldValues && typeof oldValues === "object" && !Array.isArray(oldValues)
      ? (oldValues as Record<string, unknown>)
      : {};
  const newRecord =
    newValues && typeof newValues === "object" && !Array.isArray(newValues)
      ? (newValues as Record<string, unknown>)
      : {};

  const fields = new Set([
    ...Object.keys(oldRecord),
    ...Object.keys(newRecord),
  ]);

  const diffs: ChangeHistoryDiff[] = [];

  for (const field of fields) {
    if (SKIP_DIFF_FIELDS.has(field)) continue;

    const oldValue = oldRecord[field];
    const newValue = newRecord[field];

    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      continue;
    }

    diffs.push({ field, oldValue, newValue });
  }

  return diffs;
}

export const actionBadgeClass: Record<
  "insert" | "update" | "delete",
  string
> = {
  insert:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  update: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  delete: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
};
