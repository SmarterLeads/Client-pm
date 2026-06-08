"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  createInternalTask,
  type InternalFormState,
} from "@/lib/actions/internal";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamMember } from "@/lib/types";
import { PmEnumValues } from "@/lib/types/enums";

const initialState: InternalFormState = {};
const priorities = PmEnumValues.task_priority;

type InternalQuickAddTaskFormProps = {
  projectId: string;
  sectionId: string;
  teamMembers: Pick<TeamMember, "id" | "name">[];
  onCreated?: (taskId: string) => void;
};

export function InternalQuickAddTaskForm({
  projectId,
  sectionId,
  teamMembers,
  onCreated,
}: InternalQuickAddTaskFormProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, pending] = useActionState(
    createInternalTask,
    initialState,
  );
  const handledTaskIdRef = useRef<string | null>(null);
  const onCreatedRef = useRef(onCreated);

  onCreatedRef.current = onCreated;

  useActionToast(state, { successMessage: "Task created" });

  useEffect(() => {
    if (!state.success || !state.id) return;
    if (handledTaskIdRef.current === state.id) return;

    handledTaskIdRef.current = state.id;
    setExpanded(false);
    router.refresh();
    onCreatedRef.current?.(state.id);
  }, [state.success, state.id, router]);

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setExpanded(true)}
      >
        + Add task
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-2 rounded-lg border border-border bg-card p-2"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="section_id" value={sectionId} />

      <Input
        name="title"
        placeholder="Task title"
        required
        autoFocus
        className="h-8"
      />
      {state.fieldErrors?.title?.[0] ? (
        <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <select
          name="priority"
          defaultValue="medium"
          className="h-8 rounded-lg border border-input px-2 text-xs dark:bg-input/30"
        >
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
        <select
          name="assignee_id"
          defaultValue=""
          className="h-8 rounded-lg border border-input px-2 text-xs dark:bg-input/30"
        >
          <option value="">Unassigned</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <Input name="due_date" type="date" className="h-8" />

      {state.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setExpanded(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
