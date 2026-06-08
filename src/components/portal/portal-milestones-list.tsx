"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveMilestone } from "@/lib/actions/portal";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import type { PortalMilestoneRow } from "@/lib/portal/types";
import { CheckIcon } from "lucide-react";

function formatDate(iso: string | null) {
  if (!iso) return "No date";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type PortalMilestonesListProps = {
  projectId: string;
  milestones: PortalMilestoneRow[];
  canApprove: boolean;
};

export function PortalMilestonesList({
  projectId,
  milestones,
  canApprove,
}: PortalMilestonesListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (milestones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No milestones for this project.</p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-border rounded-lg border border-border">
        {milestones.map((milestone) => {
          const isApproved = milestone.approved_by_client;
          const isComplete = milestone.completed;

          return (
            <li
              key={milestone.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{milestone.title}</p>
                <p className="text-sm text-muted-foreground">
                  Target {formatDate(milestone.target_date)}
                  {isComplete ? " · Completed" : " · Pending"}
                  {isApproved ? " · Client approved" : ""}
                </p>
              </div>
              {canApprove && !isApproved && !isComplete ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={pendingId === milestone.id}
                  onClick={() => {
                    setError(null);
                    setPendingId(milestone.id);
                    startTransition(async () => {
                      const result = await approveMilestone(
                        projectId,
                        milestone.id,
                      );
                      setPendingId(null);
                      if (result.error) {
                        setError(result.error);
                        toastError(result.error);
                        return;
                      }
                      toastSuccess("Milestone approved");
                      router.refresh();
                    });
                  }}
                >
                  <CheckIcon className="size-4" aria-hidden />
                  Approve
                </Button>
              ) : isApproved ? (
                <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckIcon className="size-4" aria-hidden />
                  Approved
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}