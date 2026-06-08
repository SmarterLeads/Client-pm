"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { loadQuickCreateProjectSections } from "@/lib/actions/quick-create";
import { createTask, type TaskFormState } from "@/lib/actions/tasks";
import { useActionToast } from "@/hooks/use-action-toast";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SheetFormActions,
  SheetFormBody,
  SheetFormField,
  sheetInputClassName,
  sheetSelectClassName,
} from "@/components/ui/sheet-form";
import {
  getQuickCreateState,
  subscribeQuickCreate,
} from "@/lib/stores/quick-create-store";
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
  const { options } = useSyncExternalStore(
    subscribeQuickCreate,
    getQuickCreateState,
    getQuickCreateState,
  );
  const defaultAssigneeId = options.taskDefaults?.assigneeId ?? "";
  const [projectId, setProjectId] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId);
  const [state, formAction, pending] = useActionState(createTask, initialState);

  useEffect(() => {
    if (!open) {
      setProjectId("");
      setSections([]);
      setAssigneeId("");
      return;
    }

    setAssigneeId(defaultAssigneeId);
  }, [open, defaultAssigneeId]);

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
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>New task</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="py-0">
            <SheetFormBody>
              {state.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              ) : null}

              <SheetFormField label="Title" required error={state.fieldErrors?.title?.[0]}>
                <Input name="title" required className={sheetInputClassName} />
              </SheetFormField>

              <SheetFormField label="Project" required error={state.fieldErrors?.project_id?.[0]}>
                <select
                  name="project_id"
                  required
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className={sheetSelectClassName}
                >
                  <option value="">Select project…</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </SheetFormField>

              <SheetFormField label="Section" error={state.fieldErrors?.section_id?.[0]}>
                <select
                  name="section_id"
                  defaultValue=""
                  disabled={!projectId || sectionsLoading}
                  className={sheetSelectClassName}
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
              </SheetFormField>

              <SheetFormField label="Assignee" error={state.fieldErrors?.assignee_id?.[0]}>
                <select
                  name="assignee_id"
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  className={sheetSelectClassName}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </SheetFormField>

              <SheetFormField label="Priority" error={state.fieldErrors?.priority?.[0]}>
                <select
                  name="priority"
                  defaultValue="medium"
                  className={sheetSelectClassName}
                >
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              </SheetFormField>

              <SheetFormField label="Due date" error={state.fieldErrors?.due_date?.[0]}>
                <Input name="due_date" type="date" className={sheetInputClassName} />
              </SheetFormField>

              <SheetFormField
                label="Estimated hours"
                error={state.fieldErrors?.estimated_hours?.[0]}
              >
                <Input
                  name="estimated_hours"
                  type="number"
                  min={0}
                  step={0.5}
                  className={sheetInputClassName}
                />
              </SheetFormField>
            </SheetFormBody>
          </SheetBody>

          <SheetFooter>
            <SheetFormActions
              primaryLabel="Create task"
              pending={pending}
              primaryDisabled={!projectId}
              onCancel={() => onOpenChange(false)}
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
