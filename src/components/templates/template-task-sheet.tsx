"use client";

import { useEffect, useState, useTransition } from "react";
import { updateTemplateTask } from "@/lib/actions/templates";
import type { ProjectTemplateTask } from "@/lib/templates/types";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { TeamMember } from "@/lib/types";
import { PmEnumValues } from "@/lib/types/enums";

const priorities = PmEnumValues.task_priority;

type TemplateTaskSheetProps = {
  task: ProjectTemplateTask | null;
  templateId: string;
  teamMembers: Pick<TeamMember, "id" | "name">[];
  onClose: () => void;
  onSaved: () => void;
};

export function TemplateTaskSheet({
  task,
  templateId,
  teamMembers,
  onClose,
  onSaved,
}: TemplateTaskSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [daysFromStart, setDaysFromStart] = useState("");

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setAssigneeId(task.assignee_id ?? "");
    setEstimatedHours(
      task.estimated_hours != null ? String(task.estimated_hours) : "",
    );
    setDaysFromStart(
      task.days_from_start != null ? String(task.days_from_start) : "",
    );
  }, [task]);

  function handleSave() {
    if (!task || !title.trim()) return;

    startTransition(async () => {
      const result = await updateTemplateTask(templateId, task.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        assignee_id: assigneeId || null,
        estimated_hours: estimatedHours ? Number(estimatedHours) : null,
        days_from_start: daysFromStart ? Number(daysFromStart) : null,
      });
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess("Task updated");
      onSaved();
    });
  }

  return (
    <Sheet open={task != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit template task</SheetTitle>
        </SheetHeader>

        {task ? (
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="edit_title">Title</Label>
              <Input
                id="edit_title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit_priority">Priority</Label>
              <select
                id="edit_priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1.5 h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="edit_assignee">Assignee</Label>
              <select
                id="edit_assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-1.5 h-8 w-full rounded-lg border border-input px-2.5 text-sm dark:bg-input/30"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit_hours">Est. hours</Label>
                <Input
                  id="edit_hours"
                  type="number"
                  min={0}
                  step={0.5}
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="mt-1.5 h-8"
                />
              </div>
              <div>
                <Label htmlFor="edit_days">Days from start</Label>
                <Input
                  id="edit_days"
                  type="number"
                  min={0}
                  value={daysFromStart}
                  onChange={(e) => setDaysFromStart(e.target.value)}
                  className="mt-1.5 h-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1.5"
              />
            </div>
            <Button type="button" disabled={isPending} onClick={handleSave}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
