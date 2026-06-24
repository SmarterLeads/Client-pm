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
  taskId: string;
  projectId: string | null;
  clientId: string | null;
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
  clientId: string | null;
  typeLabel: string;
  clientName: string;
  summary: string;
  occurredAt: string;
  occurredAtLabel: string;
};

export type TeamActivityClientUpdateRow = {
  id: string;
  clientId: string | null;
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

function readJsonTextField(values: Json | null, key: string): string | null {
  if (!values || typeof values !== "object" || Array.isArray(values)) return null;
  const value = (values as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readRawStatus(values: Json | null): string | null {
  return readJsonTextField(values, "status");
}

function formatStoredStatus(value: string | null): string {
  return value ? formatTaskStatus(value) : "—";
}

/** Mirrors SQL: (old_values->>'status') IS DISTINCT FROM (new_values->>'status') */
function hasDistinctStatusChange(
  oldValues: Json | null,
  newValues: Json | null,
): boolean {
  const oldStatus = readRawStatus(oldValues);
  const newStatus = readRawStatus(newValues);
  if (oldStatus === null && newStatus === null) return false;
  return oldStatus !== newStatus;
}

function isTaskStatusChangeRow(row: {
  action: string;
  entity_type: string;
  old_values: Json | null;
  new_values: Json | null;
}): boolean {
  if (row.action !== "update") return false;
  const normalizedType = row.entity_type.replace(/^(public|pm)\./, "");
  if (normalizedType !== "tasks") return false;
  return hasDistinctStatusChange(row.old_values, row.new_values);
}

async function fetchTaskActivityForMember(
  memberId: string,
  startIso: string,
  endIso: string,
): Promise<TeamActivityTaskRow[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("change_history")
    .select(
      "id, entity_id, entity_type, changed_at, old_values, new_values, action",
    )
    .or("entity_type.eq.pm.tasks,entity_type.eq.tasks")
    .eq("action", "update")
    .eq("changed_by", memberId)
    .gte("changed_at", startIso)
    .lte("changed_at", endIso)
    .order("changed_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter(isTaskStatusChangeRow);
  const taskIds = [...new Set(rows.map((row) => row.entity_id))];

  const taskMeta = new Map<
    string,
    {
      projectId: string;
      projectName: string;
      clientId: string | null;
      clientName: string;
    }
  >();

  if (taskIds.length > 0) {
    const { data: tasks, error: tasksError } = await pm(supabase)
      .from("tasks")
      .select(
        `
        id,
        project_id,
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
        projectId: task.project_id,
        projectName: task.project?.name ?? "—",
        clientId: task.project?.client_id ?? null,
        clientName: clientNameFromMap(task.project?.client_id, clientNames),
      });
    }
  }

  return rows.map((row) => {
    const meta = taskMeta.get(row.entity_id);

    return {
      id: row.id,
      taskId: row.entity_id,
      projectId: meta?.projectId ?? null,
      clientId: meta?.clientId ?? null,
      taskName: readJsonTextField(row.new_values, "title") ?? "Untitled task",
      projectName: meta?.projectName ?? "—",
      clientName: meta?.clientName ?? "—",
      oldStatus: formatStoredStatus(readRawStatus(row.old_values)),
      newStatus: formatStoredStatus(readRawStatus(row.new_values)),
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
    clientId: row.client_id,
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
    clientId: row.client_id,
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
