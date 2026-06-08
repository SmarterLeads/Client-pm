"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { loadQuickCreateProjectSections } from "@/lib/actions/quick-create";
import { createTask, type TaskFormState } from "@/lib/actions/tasks";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { SelectOption } from "@/lib/queries/projects";
import { PmEnumValues } from "@/lib/types/enums";
import type { TeamMember } from "@/lib/types";

const initialState: TaskFormState = {};
const priorities = PmEnumValues.task_priority;

type SectionOption = { id: string; name: string };

type NewTaskQuickSheetProps = {
  projects: SelectOption[];
  teamMembers: Pick<TeamMember, "id" | "name" | "email">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewTaskQuickSheet({
  projects,
  teamMembers,
  open,
  onOpenChange,
}: NewTaskQuickSheetProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [state, formAction, pending] = useActionState(createTask, initialState);

  useEffect(() => {
    if (!open) {
      setProjectId("");
      setSections([]);
    }
  }, [open]);

  useEffect(() => {
    if (!projectId) {
      setSections([]);
      return;
    }

    let cancelled = false;
    setSectionsLoading(true);
    loadQuickCreateProjectSections(projectId)
      .then((rows) => {
        if (!cancelled) setSections(rows);
      })
      .finally(() => {
        if (!cancelled) setSectionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useActionToast(state, {
    successMessage: "Task created",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New task</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="mt-6 space-y-4">
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <Field label="Title" required error={state.fieldErrors?.title?.[0]}>
            <Input name="title" required />
          </Field>

          <Field label="Project" required error={state.fieldErrors?.project_id?.[0]}>
            <select
              name="project_id"
              required
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              <option value="">Select project…</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Section" error={state.fieldErrors?.section_id?.[0]}>
            <select
              name="section_id"
              defaultValue=""
              disabled={!projectId || sectionsLoading}
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              <option value="">
                {sectionsLoading
                  ? "Loading sections…"
                  : projectId
                    ? "None"
                    : "Select a project first"}
              </option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assignee" error={state.fieldErrors?.assignee_id?.[0]}>
            <select
              name="assignee_id"
              defaultValue=""
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority" error={state.fieldErrors?.priority?.[0]}>
            <select
              name="priority"
              defaultValue="medium"
              className="h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Due date" error={state.fieldErrors?.due_date?.[0]}>
            <Input name="due_date" type="date" />
          </Field>

          <Field
            label="Estimated hours"
            error={state.fieldErrors?.estimated_hours?.[0]}
          >
            <Input
              name="estimated_hours"
              type="number"
              min={0}
              step={0.5}
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending || !projectId}>
              {pending ? "Creating…" : "Create task"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
