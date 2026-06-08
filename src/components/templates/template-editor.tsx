"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { TaskPriorityBadge } from "@/components/projects/task-priority-badge";
import { TemplateTaskSheet } from "@/components/templates/template-task-sheet";
import {
  createTemplateSection,
  createTemplateTask,
  deleteTemplate,
  deleteTemplateSection,
  deleteTemplateTask,
  duplicateTemplate,
  reorderTemplateSections,
  updateTemplate,
} from "@/lib/actions/templates";
import type { TemplateDetail, ProjectTemplateTask } from "@/lib/templates/types";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TeamMember } from "@/lib/types";
import { PmEnumValues } from "@/lib/types/enums";
import { cn } from "@/lib/utils";

const priorities = PmEnumValues.task_priority;

type TemplateEditorProps = {
  detail: TemplateDetail;
  teamMembers: Pick<TeamMember, "id" | "name">[];
  isAdmin: boolean;
};

export function TemplateEditor({
  detail,
  teamMembers,
  isAdmin,
}: TemplateEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sections, setSections] = useState(detail.sections);
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [addingTaskSectionId, setAddingTaskSectionId] = useState<string | null>(
    null,
  );
  const [editTask, setEditTask] = useState<ProjectTemplateTask | null>(null);

  function refresh() {
    router.refresh();
  }

  function saveHeader(name: string, description: string) {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await updateTemplate(
        detail.template.id,
        name.trim(),
        description.trim() || null,
      );
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Template updated");
      refresh();
    });
  }

  function handleAddSection() {
    if (!newSectionName.trim()) return;
    startTransition(async () => {
      const result = await createTemplateSection(
        detail.template.id,
        newSectionName.trim(),
        sections.length,
      );
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Section added");
      setNewSectionName("");
      setAddingSection(false);
      refresh();
    });
  }

  function handleDeleteSection(sectionId: string, sectionName: string) {
    if (
      !window.confirm(
        `Delete section "${sectionName}" and all its tasks? This cannot be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteTemplateSection(
        detail.template.id,
        sectionId,
      );
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Section deleted");
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      refresh();
    });
  }

  function handleSectionDrop(targetId: string) {
    if (!dragSectionId || dragSectionId === targetId) return;

    const ids = sections.map((s) => s.id);
    const from = ids.indexOf(dragSectionId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;

    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragSectionId);

    const reordered = next
      .map((id, index) => {
        const section = sections.find((s) => s.id === id);
        return section ? { ...section, display_order: index } : null;
      })
      .filter(Boolean) as typeof sections;

    setSections(reordered);
    setDragSectionId(null);

    startTransition(async () => {
      const result = await reorderTemplateSections(detail.template.id, next);
      if (result.error) {
        toastError(result.error);
        refresh();
        return;
      }
      refresh();
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateTemplate(detail.template.id);
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Template duplicated");
      if (result.templateId) {
        router.push(`/settings/templates/${result.templateId}`);
      }
    });
  }

  function handleDeleteTemplate() {
    if (
      !window.confirm(
        `Delete template "${detail.template.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteTemplate(detail.template.id);
      if (result?.error) {
        toastError(result.error);
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Input
          defaultValue={detail.template.name}
          className="text-xl font-semibold"
          onBlur={(e) =>
            saveHeader(e.target.value, detail.template.description ?? "")
          }
        />
        <Textarea
          defaultValue={detail.template.description ?? ""}
          rows={2}
          placeholder="Description"
          onBlur={(e) =>
            saveHeader(detail.template.name, e.target.value)
          }
        />
        {detail.created_by_name ? (
          <p className="text-xs text-muted-foreground">
            Created by {detail.created_by_name}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => setDragSectionId(section.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleSectionDrop(section.id)}
            className={cn(
              "rounded-lg border border-border bg-card",
              dragSectionId === section.id && "opacity-60",
            )}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <GripVertical className="size-4 cursor-grab text-muted-foreground" />
              <h3 className="flex-1 text-sm font-medium">{section.name}</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => handleDeleteSection(section.id, section.name)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>

            <div className="divide-y divide-border">
              {buildTaskTree(section.tasks).map(({ task, depth }) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ paddingLeft: `${12 + depth * 20}px` }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <TaskPriorityBadge priority={task.priority} />
                      {task.estimated_hours != null ? (
                        <span>{task.estimated_hours}h est.</span>
                      ) : null}
                      {task.days_from_start != null ? (
                        <span>Due +{task.days_from_start}d</span>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditTask(task)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending}
                    onClick={() => {
                      if (!window.confirm("Delete this task?")) return;
                      startTransition(async () => {
                        const result = await deleteTemplateTask(
                          detail.template.id,
                          task.id,
                        );
                        if (result.error) {
                          toastError(result.error);
                          return;
                        }
                        toastSuccess("Task deleted");
                        refresh();
                      });
                    }}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {addingTaskSectionId === section.id ? (
              <AddTaskForm
                templateId={detail.template.id}
                sectionId={section.id}
                teamMembers={teamMembers}
                parentOptions={section.tasks.filter((t) => !t.parent_task_id)}
                displayOrder={section.tasks.length}
                onCancel={() => setAddingTaskSectionId(null)}
                onSuccess={() => {
                  setAddingTaskSectionId(null);
                  refresh();
                }}
              />
            ) : (
              <div className="border-t border-border p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setAddingTaskSectionId(section.id)}
                >
                  <Plus className="size-3.5" />
                  Add task
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {addingSection ? (
        <div className="flex gap-2 rounded-lg border border-border p-3">
          <Input
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            placeholder="Section name"
            autoFocus
            className="h-8 flex-1"
          />
          <Button type="button" size="sm" disabled={isPending} onClick={handleAddSection}>
            Add
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAddingSection(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAddingSection(true)}
        >
          <Plus className="size-3.5" />
          Add section
        </Button>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" disabled={isPending} onClick={handleDuplicate}>
          Duplicate template
        </Button>
        {isAdmin ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleDeleteTemplate}
          >
            Delete template
          </Button>
        ) : null}
      </div>

      <TemplateTaskSheet
        task={editTask}
        templateId={detail.template.id}
        teamMembers={teamMembers}
        onClose={() => setEditTask(null)}
        onSaved={() => {
          setEditTask(null);
          refresh();
        }}
      />
    </div>
  );
}

function buildTaskTree(tasks: ProjectTemplateTask[]) {
  const roots = tasks.filter((t) => !t.parent_task_id);
  const byParent = new Map<string, ProjectTemplateTask[]>();

  for (const task of tasks) {
    if (!task.parent_task_id) continue;
    const list = byParent.get(task.parent_task_id) ?? [];
    list.push(task);
    byParent.set(task.parent_task_id, list);
  }

  const out: { task: ProjectTemplateTask; depth: number }[] = [];

  function walk(task: ProjectTemplateTask, depth: number) {
    out.push({ task, depth });
    for (const child of byParent.get(task.id) ?? []) {
      walk(child, depth + 1);
    }
  }

  for (const root of roots) {
    walk(root, 0);
  }

  return out;
}

function AddTaskForm({
  templateId,
  sectionId,
  teamMembers,
  parentOptions,
  displayOrder,
  onCancel,
  onSuccess,
}: {
  templateId: string;
  sectionId: string;
  teamMembers: Pick<TeamMember, "id" | "name">[];
  parentOptions: ProjectTemplateTask[];
  displayOrder: number;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [daysFromStart, setDaysFromStart] = useState("");
  const [description, setDescription] = useState("");
  const [parentTaskId, setParentTaskId] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      const result = await createTemplateTask(templateId, sectionId, {
        title: title.trim(),
        priority,
        assignee_id: assigneeId || null,
        estimated_hours: estimatedHours ? Number(estimatedHours) : null,
        days_from_start: daysFromStart ? Number(daysFromStart) : null,
        description: description.trim() || null,
        parent_task_id: parentTaskId || null,
        display_order: displayOrder,
      });
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Task added");
      onSuccess();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 border-t border-border bg-muted/20 p-3"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title *"
        required
        className="h-8"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="h-8 rounded-lg border border-input px-2 text-xs dark:bg-input/30"
        >
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
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
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          min={0}
          step={0.5}
          value={estimatedHours}
          onChange={(e) => setEstimatedHours(e.target.value)}
          placeholder="Est. hours"
          className="h-8"
        />
        <Input
          type="number"
          min={0}
          value={daysFromStart}
          onChange={(e) => setDaysFromStart(e.target.value)}
          placeholder="Due days from start"
          className="h-8"
        />
      </div>
      {parentOptions.length > 0 ? (
        <select
          value={parentTaskId}
          onChange={(e) => setParentTaskId(e.target.value)}
          className="h-8 w-full rounded-lg border border-input px-2 text-xs dark:bg-input/30"
        >
          <option value="">Top-level task</option>
          {parentOptions.map((t) => (
            <option key={t.id} value={t.id}>
              Subtask of: {t.title}
            </option>
          ))}
        </select>
      ) : null}
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding…" : "Add task"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
