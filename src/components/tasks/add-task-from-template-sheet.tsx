"use client";

import { LayoutTemplate, Search } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { TaskPriorityBadge } from "@/components/projects/task-priority-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  addTaskFromTemplate,
  loadTemplateTaskPickerGroups,
} from "@/lib/actions/tasks";
import type { TemplateTaskPickerGroup } from "@/lib/templates/types";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

type AddTaskFromTemplateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sectionId: string;
  onTaskCreated: (taskId: string) => void;
};

export function AddTaskFromTemplateSheet({
  open,
  onOpenChange,
  projectId,
  sectionId,
  onTaskCreated,
}: AddTaskFromTemplateSheetProps) {
  const [groups, setGroups] = useState<TemplateTaskPickerGroup[]>([]);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startLoadTransition] = useTransition();
  const [isAdding, startAddTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setSearch("");
      setLoadError(null);
      return;
    }

    startLoadTransition(async () => {
      try {
        const data = await loadTemplateTaskPickerGroups();
        setGroups(data);
        setLoadError(null);
      } catch (err) {
        setGroups([]);
        setLoadError(
          err instanceof Error ? err.message : "Failed to load templates.",
        );
      }
    });
  }, [open]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups
      .map((group) => ({
        ...group,
        tasks: group.tasks.filter((task) =>
          task.title.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.tasks.length > 0);
  }, [groups, search]);

  function handleSelect(templateTaskId: string) {
    startAddTransition(async () => {
      const result = await addTaskFromTemplate(
        projectId,
        templateTaskId,
        sectionId,
      );
      if (result.error) {
        toastError(result.error);
        return;
      }
      if (result.taskId) {
        onTaskCreated(result.taskId);
        onOpenChange(false);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <LayoutTemplate className="size-4 text-muted-foreground" />
            Add from template
          </SheetTitle>
        </SheetHeader>

        <div className="relative mt-4 shrink-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks…"
            aria-label="Search template tasks"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading templates…</p>
          ) : loadError ? (
            <p className="text-sm text-destructive" role="alert">
              {loadError}
            </p>
          ) : filteredGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {groups.length === 0
                ? "No active templates with tasks."
                : "No tasks match your search."}
            </p>
          ) : (
            <div className="space-y-5 pb-4">
              {filteredGroups.map((group) => (
                <section key={group.templateId}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.templateName}
                  </h3>
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {group.tasks.map((task) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          disabled={isAdding}
                          onClick={() => handleSelect(task.id)}
                          className={cn(
                            "flex w-full flex-col gap-1 px-3 py-2.5 text-left text-sm transition hover:bg-muted/50",
                            isAdding && "opacity-60",
                          )}
                        >
                          <span className="flex items-center justify-between gap-2 font-medium">
                            <span className="min-w-0 truncate">{task.title}</span>
                            <TaskPriorityBadge priority={task.priority} />
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {[
                              task.sectionName,
                              task.subtaskCount > 0
                                ? `${task.subtaskCount} subtask${task.subtaskCount === 1 ? "" : "s"}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isAdding}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
