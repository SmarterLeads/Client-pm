"use client";

import { useRouter } from "next/navigation";
import { useActionState, useOptimistic, useTransition } from "react";
import {
  createMilestone,
  toggleMilestoneComplete,
  type ProjectFormState,
} from "@/lib/actions/projects";
import { useActionToast } from "@/hooks/use-action-toast";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Milestone } from "@/lib/types";

const initialState: ProjectFormState = {};

type ProjectMilestonesTabProps = {
  projectId: string;
  milestones: Milestone[];
};

function formatDate(iso: string | null) {
  if (!iso) return "No date";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isOverdue(milestone: Milestone) {
  if (milestone.completed || !milestone.target_date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return milestone.target_date < today;
}

export function ProjectMilestonesTab({
  projectId,
  milestones: initialMilestones,
}: ProjectMilestonesTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const boundAction = createMilestone.bind(null, projectId);
  const [formState, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  const [optimisticMilestones, setOptimisticMilestones] = useOptimistic(
    initialMilestones,
    (current, update: { id: string; completed: boolean }) =>
      current.map((m) =>
        m.id === update.id ? { ...m, completed: update.completed } : m,
      ),
  );

  useActionToast(formState, {
    successMessage: "Milestone created",
    onSuccess: () => router.refresh(),
  });

  function handleToggle(milestone: Milestone) {
    const next = !milestone.completed;
    startTransition(async () => {
      setOptimisticMilestones({ id: milestone.id, completed: next });
      const result = await toggleMilestoneComplete(
        projectId,
        milestone.id,
        next,
      );
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess(next ? "Milestone completed" : "Milestone reopened");
    });
  }

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-3 sm:space-y-0 sm:flex sm:gap-3">
          <div className="flex-1">
            <Label htmlFor="milestone_title">Add milestone</Label>
            <Input
              id="milestone_title"
              name="title"
              placeholder="Milestone title"
              required
              className="mt-1.5"
            />
            {formState.fieldErrors?.title?.[0] ? (
              <p className="mt-1 text-xs text-destructive">
                {formState.fieldErrors.title[0]}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="milestone_date">Target date</Label>
            <Input
              id="milestone_date"
              name="target_date"
              type="date"
              className="mt-1.5"
            />
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </form>

      {formState.error ? (
        <p className="text-sm text-destructive">{formState.error}</p>
      ) : null}

      {optimisticMilestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {optimisticMilestones.map((milestone) => (
            <li
              key={milestone.id}
              className={`flex items-start gap-3 px-4 py-3 ${
                isOverdue(milestone) ? "bg-destructive/5" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={milestone.completed}
                onChange={() => handleToggle(milestone)}
                className="mt-1 size-4 rounded border-input"
                aria-label={`Mark ${milestone.title} complete`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`font-medium ${
                    milestone.completed ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {milestone.title}
                </p>
                <p
                  className={`text-sm ${
                    isOverdue(milestone)
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatDate(milestone.target_date)}
                  {isOverdue(milestone) ? " · Overdue" : ""}
                </p>
                {milestone.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {milestone.description}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
