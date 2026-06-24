"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isValidIsoDate,
  parseTeamActivityRangePreset,
  teamActivityRangeOptions,
  type TeamActivityRangePreset,
} from "@/lib/team/activity-date-range";

type TeamActivityFiltersProps = {
  teamMembers: { id: string; name: string }[];
};

export function TeamActivityFilters({ teamMembers }: TeamActivityFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const [isPending, startTransition] = useTransition();

  const member = searchParams.get("ta_member") ?? "";
  const range = parseTeamActivityRangePreset(
    searchParams.get("ta_range") ?? undefined,
  );
  const from = searchParams.get("ta_from") ?? "";
  const to = searchParams.get("ta_to") ?? "";

  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function applyFilters(updates: {
    member?: string;
    range?: TeamActivityRangePreset;
    from?: string;
    to?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextMember = updates.member ?? member;
    const nextRange = updates.range ?? range;
    const nextFrom = updates.from ?? customFrom;
    const nextTo = updates.to ?? customTo;

    if (nextMember) params.set("ta_member", nextMember);
    else params.delete("ta_member");

    params.set("ta_range", nextRange);

    if (nextRange === "custom") {
      if (nextFrom) params.set("ta_from", nextFrom);
      else params.delete("ta_from");
      if (nextTo) params.set("ta_to", nextTo);
      else params.delete("ta_to");
    } else {
      params.delete("ta_from");
      params.delete("ta_to");
    }

    startTransition(() => {
      const qs = params.toString();
      router.replace(qs ? `/team?${qs}` : "/team");
    });
  }

  function handleRangeChange(nextRange: TeamActivityRangePreset) {
    if (nextRange === "custom") {
      applyFilters({ range: nextRange });
      return;
    }
    applyFilters({ range: nextRange });
  }

  function handleApplyCustom() {
    if (!isValidIsoDate(customFrom) || !isValidIsoDate(customTo)) return;
    if (customFrom > customTo) return;
    applyFilters({ range: "custom", from: customFrom, to: customTo });
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border border-border bg-card p-4 ${isPending ? "opacity-70" : ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[180px] flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Team member</span>
          <select
            value={member}
            onChange={(e) => applyFilters({ member: e.target.value })}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
            aria-label="Filter by team member"
          >
            <option value="">All team members</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[160px] flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Date range</span>
          <select
            value={range}
            onChange={(e) =>
              handleRangeChange(parseTeamActivityRangePreset(e.target.value))
            }
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
            aria-label="Filter by date range"
          >
            {teamActivityRangeOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {range === "custom" ? (
          <>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">From</span>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 w-full sm:w-40"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">To</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 w-full sm:w-40"
              />
            </label>
            <Button type="button" size="sm" onClick={handleApplyCustom}>
              Apply
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
