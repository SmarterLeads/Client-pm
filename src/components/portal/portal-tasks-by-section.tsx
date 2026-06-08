import { PortalTaskStatusBadge } from "@/components/portal/portal-task-status-badge";
import type { PortalSectionWithTasks } from "@/lib/portal/types";

function countProgress(sections: PortalSectionWithTasks[]) {
  const tasks = sections.flatMap((section) => section.tasks);
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  return { done, total };
}

export function PortalTasksBySection({
  sections,
}: {
  sections: PortalSectionWithTasks[];
}) {
  const withTasks = sections.filter((s) => s.tasks.length > 0);
  const { done, total } = countProgress(sections);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  if (withTasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No task progress to show.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium">Overall progress</span>
          <span className="text-muted-foreground">
            {done} of {total} tasks complete ({percent}%)
          </span>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Task completion progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {withTasks.map((section) => (
        <section key={section.id}>
          <h3 className="mb-3 text-sm font-semibold">{section.name}</h3>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {section.tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <p className="min-w-0 font-medium">{task.title}</p>
                <PortalTaskStatusBadge status={task.status} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
