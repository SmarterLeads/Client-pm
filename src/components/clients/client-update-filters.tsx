"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { formatStoredUpdateChannel } from "@/lib/updates/display";
import type { TeamMember } from "@/lib/types";

type ClientUpdateFiltersProps = {
  channelOptions: string[];
  teamMembers: Pick<TeamMember, "id" | "name">[];
};

export function ClientUpdateFilters({
  channelOptions,
  teamMembers,
}: ClientUpdateFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const channel = searchParams.get("channel") ?? "";
  const loggedBy = searchParams.get("loggedBy") ?? "";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "updates");

    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${isPending ? "opacity-70" : ""}`}
    >
      <input
        type="date"
        value={from}
        onChange={(e) => updateParams({ from: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-40 dark:bg-input/30"
        aria-label="From date"
      />
      <input
        type="date"
        value={to}
        onChange={(e) => updateParams({ to: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-40 dark:bg-input/30"
        aria-label="To date"
      />
      <select
        value={channel}
        onChange={(e) => updateParams({ channel: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-48 dark:bg-input/30"
        aria-label="Filter by marketing channel"
      >
        <option value="">All channels</option>
        {channelOptions.map((value) => (
          <option key={value} value={value}>
            {formatStoredUpdateChannel(value).label}
          </option>
        ))}
      </select>
      <select
        value={loggedBy}
        onChange={(e) => updateParams({ loggedBy: e.target.value })}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:w-44 dark:bg-input/30"
        aria-label="Filter by person"
      >
        <option value="">All people</option>
        {teamMembers.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
    </div>
  );
}
