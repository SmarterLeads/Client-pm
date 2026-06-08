import type { ProjectHealth } from "@/lib/queries/projects";

export function ProjectHealthWidget({ health }: { health: ProjectHealth }) {
  const stats = [
    { label: "Total tasks", value: health.total_tasks },
    { label: "Done", value: health.done_tasks },
    {
      label: "Overdue",
      value: health.overdue_tasks,
      highlight: health.overdue_tasks > 0,
    },
    {
      label: "Est. hours",
      value: health.estimated_hours,
    },
    {
      label: "Logged hours",
      value: health.logged_hours,
    },
    {
      label: "Days remaining",
      value:
        health.days_remaining === null
          ? "—"
          : health.days_remaining < 0
            ? `${Math.abs(health.days_remaining)} overdue`
            : health.days_remaining,
      highlight:
        health.days_remaining !== null && health.days_remaining < 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-border bg-card px-3 py-2"
        >
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p
            className={`text-lg font-semibold tabular-nums ${
              stat.highlight ? "text-destructive" : ""
            }`}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
