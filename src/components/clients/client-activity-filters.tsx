"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { activityCategoryFilterOptions } from "@/components/clients/client-activity-display";
import { Button } from "@/components/ui/button";
import type { ActivityEventCategory } from "@/lib/clients/activity-log";
import { cn } from "@/lib/utils";

type ClientActivityFiltersProps = {
  teamMembers: { id: string; name: string }[];
};

export function ClientActivityFilters({
  teamMembers,
}: ClientActivityFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedTypes = useMemo(() => {
    const raw = searchParams.get("activity_types") ?? "";
    return raw
      .split(",")
      .filter(Boolean) as ActivityEventCategory[];
  }, [searchParams]);

  const from = searchParams.get("activity_from") ?? "";
  const to = searchParams.get("activity_to") ?? "";
  const teamMemberId = searchParams.get("activity_by") ?? "";

  const hasActiveFilters = Boolean(
    selectedTypes.length || from || to || teamMemberId,
  );

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "history");

    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function toggleType(type: ActivityEventCategory) {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((item) => item !== type)
      : [...selectedTypes, type];
    updateParams({ activity_types: next.join(",") });
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "history");
    params.delete("activity_types");
    params.delete("activity_from");
    params.delete("activity_to");
    params.delete("activity_by");

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className={cn("space-y-3", isPending && "opacity-70")}>
      <div className="flex flex-wrap gap-2">
        {activityCategoryFilterOptions.map((option) => {
          const active = selectedTypes.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleType(option.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="date"
          value={from}
          onChange={(event) =>
            updateParams({ activity_from: event.target.value })
          }
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-40 dark:bg-input/30"
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(event) => updateParams({ activity_to: event.target.value })}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-40 dark:bg-input/30"
          aria-label="To date"
        />
        <select
          value={teamMemberId}
          onChange={(event) =>
            updateParams({ activity_by: event.target.value })
          }
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
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
