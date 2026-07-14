"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import type { TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";

type TeamMembersMultiSelectProps = {
  teamMembers: Pick<TeamMember, "id" | "name" | "email">[];
  name?: string;
  label?: string;
  error?: string;
  className?: string;
  defaultSelectedIds?: string[];
};

export function TeamMembersMultiSelect({
  teamMembers,
  name = "member_ids",
  label = "Team members",
  error,
  className,
  defaultSelectedIds = [],
}: TeamMembersMultiSelectProps) {
  const defaultSet = useMemo(
    () => new Set(defaultSelectedIds),
    [defaultSelectedIds],
  );
  const [selected, setSelected] = useState<Set<string>>(defaultSet);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-1.5 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-input p-2 dark:bg-input/30">
        {teamMembers.length === 0 ? (
          <p className="px-2 py-1 text-sm text-muted-foreground">
            No team members available.
          </p>
        ) : (
          teamMembers.map((member) => {
            const checked = selected.has(member.id);
            return (
              <label
                key={member.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60",
                  checked && "bg-muted/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(member.id)}
                  className="size-4 rounded border-input"
                />
                <span className="font-medium">{member.name}</span>
                <span className="truncate text-muted-foreground">
                  {member.email}
                </span>
                {checked ? (
                  <input type="hidden" name={name} value={member.id} />
                ) : null}
              </label>
            );
          })
        )}
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
