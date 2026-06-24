import { formatAbsoluteTime } from "@/lib/change-history/display";
import {
  clientNameFromMap,
  loadClientNameMap,
} from "@/lib/clients/client-names";
import { formatStoredUpdateChannel } from "@/lib/updates/display";
import { interactionTypeLabel } from "@/lib/interactions/display";
import type { InteractionType } from "@/lib/interactions/types";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import {
  resolveTeamActivityWindow,
  type TeamActivityDateRange,
  type TeamActivityWindow,
} from "@/lib/team/activity-date-range";
import { TASK_STATUS_LABELS } from "@/lib/tasks/status-options";
import type { Json, TaskStatus } from "@/lib/types";

export type TeamActivityTaskRow = {
  id: string;
  taskName: string;
  projectName: string;
  clientName: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
  changedAtLabel: string;
};

export type TeamActivityInteractionRow = {
  id: string;
  typeLabel: string;
  clientName: string;
  summary: string;
  occurredAt: string;
  occurredAtLabel: string;
};

export type TeamActivityClientUpdateRow = {
  id: string;
  channelLabel: string;
  clientName: string;
  summary: string;
  occurredAt: string;
  occurredAtLabel: string;
};

export type TeamMemberActivityReport = {
  memberId: string;
  memberName: string;
  summary: {
    tasksChanged: number;
    interactionsLogged: number;
    clientUpdatesLogged: number;
  };
  taskActivity: TeamActivityTaskRow[];
  interactions: TeamActivityInteractionRow[];
  clientUpdates: TeamActivityClientUpdateRow[];
};

export type TeamActivityReportResult = {
  window: TeamActivityWindow;
  reports: TeamMemberActivityReport[];
};

function formatTaskStatus(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "—";
  const key = value.trim() as TaskStatus;
  return TASK_STATUS_LABELS[key] ?? key.replace(/_/g, " ");
}

function readStatusFromValues(values: Json | null): string {
  if (!values || typeof values !== "object" || Array.isArray(values)) return "—";
  return formatTaskStatus((values as Record<string, unknown>).status);
}

function readTitleFromValues(values: Json | null): string | null {
  if (!values || typeof values !== "object" || Array.isArray(values)) return null;
  const title = (values as Record<string, unknown>).title;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

async function fetchTaskActivityForMember(
  memberId: string,
  startIso: string,
  endIso: string,
): Promise<TeamActivityTaskRow[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("change_history")
    .select("id, entity_id, changed_at, old_values, new_values, action")
    .in("entity_type", ["tasks", "pm.tasks"])
    .eq("changed_by", memberId)
    .gte("changed_at", startIso)
    .lte("changed_at", endIso)
    .order("changed_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const taskIds = [...new Set(rows.map((row) => row.entity_id))];

  const taskMeta = new Map<
    string,
    { title: string; projectName: string; clientName: string }
  >();

  if (taskIds.length > 0) {
    const { data: tasks, error: tasksError } = await pm(supabase)
      .from("tasks")
      .select(
        `
        id,
        title,
        project:projects(
          name,
          client_id
        )
      `,
      )
      .in("id", taskIds);

    if (tasksError) throw new Error(tasksError.message);

    const clientIds = (tasks ?? [])
      .map((task) => task.project?.client_id)
      .filter((id): id is string => Boolean(id));
    const clientNames = await loadClientNameMap(supabase, clientIds);

    for (const task of tasks ?? []) {
      taskMeta.set(task.id, {
        title: task.title ?? "Untitled task",
        projectName: task.project?.name ?? "—",
        clientName: clientNameFromMap(task.project?.client_id, clientNames),
      });
    }
  }

  return rows.map((row) => {
    const meta = taskMeta.get(row.entity_id);
    const fallbackTitle =
      readTitleFromValues(row.new_values) ??
      readTitleFromValues(row.old_values) ??
      "Task";

    let oldStatus = "—";
    let newStatus = "—";
    if (row.action === "insert") {
      newStatus = readStatusFromValues(row.new_values);
    } else if (row.action === "delete") {
      oldStatus = readStatusFromValues(row.old_values);
    } else {
      oldStatus = readStatusFromValues(row.old_values);
      newStatus = readStatusFromValues(row.new_values);
    }

    return {
      id: row.id,
      taskName: meta?.title ?? fallbackTitle,
      projectName: meta?.projectName ?? "—",
      clientName: meta?.clientName ?? "—",
      oldStatus,
      newStatus,
      changedAt: row.changed_at,
      changedAtLabel: formatAbsoluteTime(row.changed_at),
    };
  });
}

async function fetchInteractionsForMember(
  memberId: string,
  startIso: string,
  endIso: string,
): Promise<TeamActivityInteractionRow[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("interactions")
    .select("id, type, summary, occurred_at, client_id")
    .eq("logged_by", memberId)
    .gte("occurred_at", startIso)
    .lte("occurred_at", endIso)
    .order("occurred_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const clientNames = await loadClientNameMap(
    supabase,
    rows.map((row) => row.client_id),
  );

  return rows.map((row) => ({
    id: row.id,
    typeLabel: interactionTypeLabel(row.type as InteractionType),
    clientName: clientNameFromMap(row.client_id, clientNames),
    summary: row.summary,
    occurredAt: row.occurred_at,
    occurredAtLabel: formatAbsoluteTime(row.occurred_at),
  }));
}

async function fetchClientUpdatesForMember(
  memberId: string,
  startIso: string,
  endIso: string,
): Promise<TeamActivityClientUpdateRow[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("client_updates")
    .select("id, marketing_channel, summary, occurred_at, client_id")
    .eq("logged_by", memberId)
    .gte("occurred_at", startIso)
    .lte("occurred_at", endIso)
    .order("occurred_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const clientNames = await loadClientNameMap(
    supabase,
    rows.map((row) => row.client_id),
  );

  return rows.map((row) => ({
    id: row.id,
    channelLabel: formatStoredUpdateChannel(row.marketing_channel).label,
    clientName: clientNameFromMap(row.client_id, clientNames),
    summary: row.summary,
    occurredAt: row.occurred_at,
    occurredAtLabel: formatAbsoluteTime(row.occurred_at),
  }));
}

export async function getTeamActivityReport(
  members: { id: string; name: string }[],
  range: TeamActivityDateRange,
  memberId?: string,
): Promise<TeamActivityReportResult> {
  const window = resolveTeamActivityWindow(range);
  const selectedMembers = memberId
    ? members.filter((member) => member.id === memberId)
    : members;

  const reports = await Promise.all(
    selectedMembers.map(async (member) => {
      const [taskActivity, interactions, clientUpdates] = await Promise.all([
        fetchTaskActivityForMember(member.id, window.startIso, window.endIso),
        fetchInteractionsForMember(member.id, window.startIso, window.endIso),
        fetchClientUpdatesForMember(member.id, window.startIso, window.endIso),
      ]);

      return {
        memberId: member.id,
        memberName: member.name,
        summary: {
          tasksChanged: taskActivity.length,
          interactionsLogged: interactions.length,
          clientUpdatesLogged: clientUpdates.length,
        },
        taskActivity,
        interactions,
        clientUpdates,
      };
    }),
  );

  return { window, reports };
}
