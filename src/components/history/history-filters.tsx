"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type HistoryFiltersProps = {
  entityTypes: string[];
  teamMembers: { id: string; name: string }[];
};

export function HistoryFilters({
  entityTypes,
  teamMembers,
}: HistoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const entityType = searchParams.get("entity_type") ?? "";
  const changedBy = searchParams.get("changed_by") ?? "";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    startTransition(() => {
      params.delete("page");
      const query = params.toString();
      router.replace(query ? `/history?${query}` : "/history");
    });
  }

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${isPending ? "opacity-70" : ""}`}
    >
      <select
        value={entityType}
        onChange={(e) => updateParams({ entity_type: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-48 dark:bg-input/30"
        aria-label="Filter by entity type"
      >
        <option value="">All entity types</option>
        {entityTypes.map((type) => (
          <option key={type} value={type}>
            {type.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <select
        value={changedBy}
        onChange={(e) => updateParams({ changed_by: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-48 dark:bg-input/30"
        aria-label="Filter by team member"
      >
        <option value="">All team members</option>
        {teamMembers.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
    </div>
  );
}
