"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useTaskDrawer } from "@/components/tasks/task-drawer-provider";
import type {
  TeamActivityClientUpdateRow,
  TeamActivityInteractionRow,
  TeamActivityReportResult,
  TeamActivityTaskRow,
} from "@/lib/queries/team-activity";
import { cn } from "@/lib/utils";

type TeamActivityReportProps = {
  report: TeamActivityReportResult;
};

type ActivityTableRow = {
  key: string;
  cells: ReactNode[];
  onClick?: () => void;
};

function ClientNameLink({
  clientId,
  name,
}: {
  clientId: string | null;
  name: string;
}) {
  if (!clientId || name === "—") {
    return <span>{name}</span>;
  }

  return (
    <Link
      href={`/clients/${clientId}`}
      className="font-medium hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      {name}
    </Link>
  );
}

function ActivityTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: ActivityTableRow[];
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
          {rows.map((row) => (
            <tr
              key={row.key}
              onClick={row.onClick}
              className={cn(
                "border-b border-border last:border-0",
                row.onClick && "cursor-pointer hover:bg-gray-50",
              )}
            >
              {row.cells.map((cell, cellIndex) => (
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

function TaskActivityTable({ rows }: { rows: TeamActivityTaskRow[] }) {
  const { openTask } = useTaskDrawer();

  return (
    <ActivityTable
      headers={[
        "Task",
        "Project",
        "Client",
        "Old status → New status",
        "Date/time",
      ]}
      emptyMessage="No task status changes in this period."
      rows={rows.map((row) => ({
        key: row.id,
        onClick: () => openTask(row.taskId),
        cells: [
          row.taskName,
          row.projectName,
          <ClientNameLink
            key={`${row.id}-client`}
            clientId={row.clientId}
            name={row.clientName}
          />,
          `${row.oldStatus} → ${row.newStatus}`,
          row.changedAtLabel,
        ],
      }))}
    />
  );
}

function InteractionsActivityTable({
  rows,
}: {
  rows: TeamActivityInteractionRow[];
}) {
  const router = useRouter();

  return (
    <ActivityTable
      headers={["Type", "Client", "Summary", "Date/time"]}
      emptyMessage="No interactions logged in this period."
      rows={rows.map((row) => ({
        key: row.id,
        onClick: row.clientId
          ? () => router.push(`/clients/${row.clientId}?tab=interactions`)
          : undefined,
        cells: [
          row.typeLabel,
          <ClientNameLink
            key={`${row.id}-client`}
            clientId={row.clientId}
            name={row.clientName}
          />,
          row.summary,
          row.occurredAtLabel,
        ],
      }))}
    />
  );
}

function ClientUpdatesActivityTable({
  rows,
}: {
  rows: TeamActivityClientUpdateRow[];
}) {
  const router = useRouter();

  return (
    <ActivityTable
      headers={["Channel", "Client", "Summary", "Date/time"]}
      emptyMessage="No client updates logged in this period."
      rows={rows.map((row) => ({
        key: row.id,
        onClick: row.clientId
          ? () => router.push(`/clients/${row.clientId}?tab=updates`)
          : undefined,
        cells: [
          row.channelLabel,
          <ClientNameLink
            key={`${row.id}-client`}
            clientId={row.clientId}
            name={row.clientName}
          />,
          row.summary,
          row.occurredAtLabel,
        ],
      }))}
    />
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
                label="Task status changes"
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
              Task status changes ({memberReport.taskActivity.length})
            </summary>
            <div className="border-t border-border p-3">
              <TaskActivityTable rows={memberReport.taskActivity} />
            </div>
          </details>

          <details className="group rounded-lg border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              Interactions logged ({memberReport.interactions.length})
            </summary>
            <div className="border-t border-border p-3">
              <InteractionsActivityTable rows={memberReport.interactions} />
            </div>
          </details>

          <details className="group rounded-lg border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              Client updates logged ({memberReport.clientUpdates.length})
            </summary>
            <div className="border-t border-border p-3">
              <ClientUpdatesActivityTable rows={memberReport.clientUpdates} />
            </div>
          </details>
        </section>
      ))}
    </div>
  );
}
