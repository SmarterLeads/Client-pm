import type { ProjectStatus, RagStatus } from "@/lib/types";

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] =
  [
    { value: "planned", label: "Planned" },
    { value: "active", label: "Active" },
    { value: "on_hold", label: "On Hold" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

export const RAG_STATUS_OPTIONS: { value: RagStatus; label: string }[] = [
  { value: "green", label: "Green" },
  { value: "amber", label: "Amber" },
  { value: "red", label: "Red" },
];

export function formatProjectDueDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isoDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}
