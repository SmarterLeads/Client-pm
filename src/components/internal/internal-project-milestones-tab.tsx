import type { InternalMilestone } from "@/lib/types/internal";

function formatDate(iso: string | null) {
  if (!iso) return "No date";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isOverdue(milestone: InternalMilestone) {
  if (milestone.completed || !milestone.target_date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return milestone.target_date < today;
}

export function InternalProjectMilestonesTab({
  milestones,
}: {
  milestones: InternalMilestone[];
}) {
  if (milestones.length === 0) {
    return <p className="text-sm text-muted-foreground">No milestones yet.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {milestones.map((milestone) => (
        <li
          key={milestone.id}
          className={`flex items-start gap-3 px-4 py-3 ${
            isOverdue(milestone) ? "bg-destructive/5" : ""
          }`}
        >
          <input
            type="checkbox"
            checked={milestone.completed}
            readOnly
            disabled
            className="mt-1 size-4 rounded border-input"
            aria-label={`${milestone.title} ${milestone.completed ? "completed" : "incomplete"}`}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`font-medium ${
                milestone.completed ? "text-muted-foreground line-through" : ""
              }`}
            >
              {milestone.title}
            </p>
            <p
              className={`text-sm ${
                isOverdue(milestone)
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {formatDate(milestone.target_date)}
              {isOverdue(milestone) ? " · Overdue" : ""}
            </p>
            {milestone.description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {milestone.description}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
