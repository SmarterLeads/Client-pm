import type { ReactNode } from "react";
import type { TeamActivityReportResult } from "@/lib/queries/team-activity";

type TeamActivityReportProps = {
  report: TeamActivityReportResult;
};

function ActivityTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, index) => (
            <tr key={index} className="border-b border-border last:border-0">
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function TeamActivityReport({ report }: TeamActivityReportProps) {
  const { window, reports } = report;

  if (reports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No team members match the selected filters.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Showing activity for <span className="font-medium">{window.label}</span>
      </p>

      {reports.map((memberReport) => (
        <section
          key={memberReport.memberId}
          className="space-y-4 rounded-xl border border-border bg-card p-4"
        >
          <div>
            <h3 className="text-lg font-semibold">{memberReport.memberName}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <SummaryStat
                label="Tasks changed"
                value={memberReport.summary.tasksChanged}
              />
              <SummaryStat
                label="Interactions logged"
                value={memberReport.summary.interactionsLogged}
              />
              <SummaryStat
                label="Client updates logged"
                value={memberReport.summary.clientUpdatesLogged}
              />
            </div>
          </div>

          <details className="group rounded-lg border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              Task activity ({memberReport.taskActivity.length})
            </summary>
            <div className="border-t border-border p-3">
              <ActivityTable
                headers={[
                  "Task",
                  "Project",
                  "Client",
                  "Status change",
                  "Date/time",
                ]}
                emptyMessage="No task changes in this period."
                rows={memberReport.taskActivity.map((row) => [
                  row.taskName,
                  row.projectName,
                  row.clientName,
                  `${row.oldStatus} → ${row.newStatus}`,
                  row.changedAtLabel,
                ])}
              />
            </div>
          </details>

          <details className="group rounded-lg border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              Interactions logged ({memberReport.interactions.length})
            </summary>
            <div className="border-t border-border p-3">
              <ActivityTable
                headers={["Type", "Client", "Summary", "Date/time"]}
                emptyMessage="No interactions logged in this period."
                rows={memberReport.interactions.map((row) => [
                  row.typeLabel,
                  row.clientName,
                  row.summary,
                  row.occurredAtLabel,
                ])}
              />
            </div>
          </details>

          <details className="group rounded-lg border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              Client updates logged ({memberReport.clientUpdates.length})
            </summary>
            <div className="border-t border-border p-3">
              <ActivityTable
                headers={["Channel", "Client", "Summary", "Date/time"]}
                emptyMessage="No client updates logged in this period."
                rows={memberReport.clientUpdates.map((row) => [
                  row.channelLabel,
                  row.clientName,
                  row.summary,
                  row.occurredAtLabel,
                ])}
              />
            </div>
          </details>
        </section>
      ))}
    </div>
  );
}
