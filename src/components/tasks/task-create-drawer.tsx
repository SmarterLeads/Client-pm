"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";

import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  sheetFieldLabelClassName,
  sheetInputClassName,
  sheetSelectClassName,
} from "@/components/ui/sheet-form";
import { createTaskDirect } from "@/lib/actions/tasks";
import type { ProjectSection, TeamMember } from "@/lib/types";
import { PmEnumValues } from "@/lib/types/enums";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

const priorities = PmEnumValues.task_priority;

type TaskCreateDrawerProps = {
  draft: {
    projectId: string;
    sectionId: string;
    assigneeId: string;
  } | null;
  sections: ProjectSection[];
  teamMembers: Pick<TeamMember, "id" | "name">[];
  isOpen: boolean;
  onClose: () => void;
};

export function TaskCreateDrawer({
  draft,
  sections,
  teamMembers,
  isOpen,
  onClose,
}: TaskCreateDrawerProps) {
  const router = useRouter();
  const { openTask } = useTaskDrawer();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!draft) return;
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssigneeId(draft.assigneeId);
    setSectionId(draft.sectionId);
    setDueDate("");
  }, [draft]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || !title.trim()) return;

    startTransition(async () => {
      const result = await createTaskDirect({
        project_id: draft.projectId,
        section_id: sectionId || draft.sectionId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        status: "todo",
      });

      if (result.error) {
        toastError(result.error);
        return;
      }

      toastSuccess("Task created");
      onClose();
      router.refresh();
      if (result.taskId) {
        openTask(result.taskId);
      }
    });
  }

  if (!isOpen || !mounted || !draft) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New task"
        className="absolute top-0 right-0 flex h-full w-full flex-col overflow-hidden border-l border-border bg-popover text-popover-foreground shadow-xl sm:w-[480px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-border px-6 pb-4 pt-6 pr-14">
          <h2 className="text-lg font-semibold tracking-tight">New task</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in the details and save.
          </p>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "absolute top-4 right-4",
            )}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
            <div>
              <label className={sheetFieldLabelClassName} htmlFor="new_task_title">
                Title
              </label>
              <Input
                id="new_task_title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                autoFocus
                className={sheetInputClassName}
                placeholder="Task title"
              />
            </div>

            <div>
              <label className={sheetFieldLabelClassName} htmlFor="new_task_description">
                Description
              </label>
              <Textarea
                id="new_task_description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={sheetFieldLabelClassName} htmlFor="new_task_priority">
                  Priority
                </label>
                <select
                  id="new_task_priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className={sheetSelectClassName}
                >
                  {priorities.map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={sheetFieldLabelClassName} htmlFor="new_task_assignee">
                  Assignee
                </label>
                <select
                  id="new_task_assignee"
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
              </div>

              <div>
                <label className={sheetFieldLabelClassName} htmlFor="new_task_section">
                  Section
                </label>
                <select
                  id="new_task_section"
                  value={sectionId}
                  onChange={(event) => setSectionId(event.target.value)}
                  className={sheetSelectClassName}
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={sheetFieldLabelClassName} htmlFor="new_task_due_date">
                  Due date
                </label>
                <Input
                  id="new_task_due_date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className={sheetInputClassName}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-t border-border px-6 py-4">
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "Creating…" : "Create task"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
