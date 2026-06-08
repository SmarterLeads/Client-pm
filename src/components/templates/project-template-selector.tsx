"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, LayoutTemplate } from "lucide-react";
import { loadTemplatePreview } from "@/lib/actions/templates";
import type { TemplatePreview, TemplateSelectOption } from "@/lib/templates/types";
import { TaskPriorityBadge } from "@/components/projects/task-priority-badge";
import { cn } from "@/lib/utils";

type ProjectTemplateSelectorProps = {
  templates: TemplateSelectOption[];
};

export function ProjectTemplateSelector({
  templates,
}: ProjectTemplateSelectorProps) {
  const [selectedId, setSelectedId] = useState("");
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedId) {
      setPreview(null);
      return;
    }

    startTransition(async () => {
      const data = await loadTemplatePreview(selectedId);
      setPreview(data);
    });
  }, [selectedId]);

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="sm:col-span-2 space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <LayoutTemplate className="size-4 text-muted-foreground" />
        Use a template
      </div>

      <select
        name="template_id"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
      >
        <option value="">No template — use default sections</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      {selectedId && preview ? (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {preview.section_count} section
            {preview.section_count === 1 ? "" : "s"} and {preview.task_count}{" "}
            task{preview.task_count === 1 ? "" : "s"} will be created
          </p>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                expanded && "rotate-180",
              )}
            />
            {expanded ? "Hide preview" : "Show preview"}
          </button>

          {expanded ? (
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
              {preview.sections.map((section) => (
                <div key={section.id}>
                  <p className="text-xs font-medium text-muted-foreground">
                    {section.name}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {section.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center gap-2 text-xs"
                        style={{
                          paddingLeft: task.parent_task_id ? "1rem" : undefined,
                        }}
                      >
                        <span>{task.title}</span>
                        <TaskPriorityBadge priority={task.priority} />
                      </li>
                    ))}
                    {section.tasks.length === 0 ? (
                      <li className="text-xs text-muted-foreground">No tasks</li>
                    ) : null}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {isPending ? (
        <p className="text-xs text-muted-foreground">Loading preview…</p>
      ) : null}
    </div>
  );
}
