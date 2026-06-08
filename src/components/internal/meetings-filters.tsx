"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MeetingTypes,
  MeetingVisibilities,
  meetingTypeLabels,
  meetingVisibilityLabels,
} from "@/lib/types/internal";
import type { MeetingFilters } from "@/lib/validations/internal";

type MeetingsFiltersProps = {
  teamMembers: { id: string; name: string }[];
};

function MeetingsFiltersInner({ teamMembers }: MeetingsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = searchParams.get("type") ?? "";
  const visibility = searchParams.get("visibility") ?? "";
  const participant = searchParams.get("participant") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const updateParams = useCallback(
    (updates: Partial<Record<keyof MeetingFilters | "from" | "to", string>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/internal/meetings?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <select
        value={type}
        onChange={(event) => updateParams({ type: event.target.value })}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
        aria-label="Filter by type"
      >
        <option value="">All types</option>
        {MeetingTypes.map((value) => (
          <option key={value} value={value}>
            {meetingTypeLabels[value]}
          </option>
        ))}
      </select>

      <select
        value={visibility}
        onChange={(event) => updateParams({ visibility: event.target.value })}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
        aria-label="Filter by visibility"
      >
        <option value="">All visibility</option>
        {MeetingVisibilities.map((value) => (
          <option key={value} value={value}>
            {meetingVisibilityLabels[value]}
          </option>
        ))}
      </select>

      <select
        value={participant}
        onChange={(event) => updateParams({ participant: event.target.value })}
        className="h-8 min-w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
        aria-label="Filter by participant"
      >
        <option value="">All participants</option>
        {teamMembers.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>

      <Input
        type="date"
        value={from}
        onChange={(event) => updateParams({ from: event.target.value })}
        className="h-8 w-40"
        aria-label="From date"
      />
      <Input
        type="date"
        value={to}
        onChange={(event) => updateParams({ to: event.target.value })}
        className="h-8 w-40"
        aria-label="To date"
      />
    </div>
  );
}

export function MeetingsFilters(props: MeetingsFiltersProps) {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-full max-w-2xl" />}>
      <MeetingsFiltersInner {...props} />
    </Suspense>
  );
}
