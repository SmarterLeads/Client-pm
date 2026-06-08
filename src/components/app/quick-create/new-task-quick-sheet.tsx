"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import {
  loadQuickCreateClientProjects,
  loadQuickCreateProjectSections,
} from "@/lib/actions/quick-create";
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
  clients: SelectOption[];
  teamMembers: Pick<TeamMember, "id" | "name" | "email">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

async function submitNewTask(
  prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  console.log(
    "[NewTaskSheet] submitting:",
    JSON.stringify(Object.fromEntries(formData.entries())),
  );
  return createTask(prevState, formData);
}

export function NewTaskQuickSheet({
  clients,
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

  const [clientId, setClientId] = useState("");
  const [projects, setProjects] = useState<SelectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId);
  const [localError, setLocalError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(submitNewTask, initialState);

  useEffect(() => {
    if (!open) {
      setClientId("");
      setProjects([]);
      setProjectId("");
      setSectionId("");
      setSections([]);
      setAssigneeId("");
      setLocalError(null);
      return;
    }

    setAssigneeId(defaultAssigneeId);
  }, [open, defaultAssigneeId]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      setProjectId("");
      setSectionId("");
      return;
    }

    let cancelled = false;
    setProjectsLoading(true);
    loadQuickCreateClientProjects(clientId)
      .then((rows) => {
        if (!cancelled) setProjects(rows);
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!projectId) {
      setSections([]);
      setSectionId("");
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

  function handleClientChange(nextClientId: string) {
    setLocalError(null);
    setClientId(nextClientId);
    setProjectId("");
    setSectionId("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    console.log(
      "[NewTaskSheet] submit handler:",
      JSON.stringify(Object.fromEntries(formData.entries())),
    );

    if (!clientId) {
      event.preventDefault();
      setLocalError("Please select a client.");
      return;
    }

    if (!projectId) {
      event.preventDefault();
      setLocalError("Please select a project.");
      return;
    }

    setLocalError(null);
  }

  useActionToast(state, {
    successMessage: "Task created",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  const displayError =
    localError ?? state.error ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>New task</SheetTitle>
        </SheetHeader>

        <form
          action={formAction}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
        >
          <SheetBody className="py-0">
            <SheetFormBody>
              {displayError ? (
                <p className="text-sm text-destructive" role="alert">
                  {displayError}
                </p>
              ) : null}

              <SheetFormField label="Client" required>
                <select
                  required
                  value={clientId}
                  onChange={(event) => handleClientChange(event.target.value)}
                  className={sheetSelectClassName}
                  aria-label="Client"
                >
                  <option value="">Select client…</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </SheetFormField>

              <SheetFormField
                label="Project"
                required
                error={state.fieldErrors?.project_id?.[0]}
              >
                <select
                  name="project_id"
                  required
                  value={projectId}
                  disabled={!clientId || projectsLoading}
                  onChange={(event) => {
                    setLocalError(null);
                    setProjectId(event.target.value);
                    setSectionId("");
                  }}
                  className={sheetSelectClassName}
                >
                  <option value="">
                    {!clientId
                      ? "Select a client first"
                      : projectsLoading
                        ? "Loading projects…"
                        : projects.length === 0
                          ? "No projects for this client"
                          : "Select project…"}
                  </option>
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
                  value={sectionId}
                  disabled={!projectId || sectionsLoading}
                  onChange={(event) => setSectionId(event.target.value)}
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

              <SheetFormField label="Title" required error={state.fieldErrors?.title?.[0]}>
                <Input name="title" required className={sheetInputClassName} />
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
              primaryDisabled={pending || !clientId || !projectId}
              onCancel={() => onOpenChange(false)}
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
