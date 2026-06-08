import type {
  DashboardBillableHoursByClientRow,
  DashboardClientHealthRow,
  DashboardKpis,
  DashboardMyTasks,
  DashboardTeamWorkloadRow,
} from "@/lib/dashboard/types";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import type { RagStatus, TaskStatus } from "@/lib/types";

const OPEN_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
];

const RAG_ORDER: Record<NonNullable<RagStatus>, number> = {
  red: 0,
  amber: 1,
  green: 2,
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const supabase = await createClient();
  const today = todayIso();

  const [activeClientsRes, openTasksRes, overdueTasksRes, billableRes] =
    await Promise.all([
      supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      pm(supabase)
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .in("status", OPEN_STATUSES),
      pm(supabase)
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .in("status", OPEN_STATUSES)
        .not("due_date", "is", null)
        .lt("due_date", today),
      pm(supabase).from("v_billable_hours_this_month").select("billable_hours"),
    ]);

  if (activeClientsRes.error) throw new Error(activeClientsRes.error.message);
  if (openTasksRes.error) throw new Error(openTasksRes.error.message);
  if (overdueTasksRes.error) throw new Error(overdueTasksRes.error.message);
  if (billableRes.error) throw new Error(billableRes.error.message);

  const billableHoursThisMonth = (billableRes.data ?? []).reduce(
    (sum, row) => sum + (row.billable_hours ?? 0),
    0,
  );

  return {
    activeClients: activeClientsRes.count ?? 0,
    openTasks: openTasksRes.count ?? 0,
    overdueTasks: overdueTasksRes.count ?? 0,
    billableHoursThisMonth: Math.round(billableHoursThisMonth * 10) / 10,
  };
}

export async function getDashboardClientHealth(): Promise<
  DashboardClientHealthRow[]
> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("v_client_health")
    .select(
      "id, name, rag_status, account_manager, active_projects, overdue_tasks, last_interaction_at",
    );

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter(
      (row): row is typeof row & { id: string; name: string } =>
        Boolean(row.id && row.name),
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      rag_status: row.rag_status,
      account_manager: row.account_manager,
      active_projects: row.active_projects ?? 0,
      overdue_tasks: row.overdue_tasks ?? 0,
      last_interaction_at: row.last_interaction_at,
    }))
    .sort((a, b) => {
      const ragA = a.rag_status ? (RAG_ORDER[a.rag_status] ?? 99) : 99;
      const ragB = b.rag_status ? (RAG_ORDER[b.rag_status] ?? 99) : 99;
      if (ragA !== ragB) return ragA - ragB;
      return a.name.localeCompare(b.name);
    });
}

export async function getDashboardTeamWorkload(): Promise<
  DashboardTeamWorkloadRow[]
> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("v_team_workload")
    .select(
      "id, name, open_tasks, overdue_tasks, capacity_hours, estimated_hours_remaining, is_available",
    )
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter(
      (row): row is typeof row & { id: string; name: string } =>
        Boolean(row.id && row.name),
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      open_tasks: row.open_tasks ?? 0,
      overdue_tasks: row.overdue_tasks ?? 0,
      capacity_hours: row.capacity_hours ?? 0,
      estimated_hours_remaining: row.estimated_hours_remaining ?? 0,
      is_available: row.is_available ?? true,
    }));
}

export async function getDashboardBillableHoursByClient(): Promise<
  DashboardBillableHoursByClientRow[]
> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("v_billable_hours_this_month")
    .select("client_id, client_name, billable_hours");

  if (error) throw new Error(error.message);

  const byClient = new Map<
    string,
    { client_name: string; billable_hours: number }
  >();

  for (const row of data ?? []) {
    if (!row.client_id || !row.client_name) continue;

    const existing = byClient.get(row.client_id) ?? {
      client_name: row.client_name,
      billable_hours: 0,
    };
    existing.billable_hours += row.billable_hours ?? 0;
    byClient.set(row.client_id, existing);
  }

  return Array.from(byClient.entries())
    .map(([client_id, value]) => ({
      client_id,
      client_name: value.client_name,
      billable_hours: Math.round(value.billable_hours * 10) / 10,
    }))
    .filter((row) => row.billable_hours > 0)
    .sort((a, b) => b.billable_hours - a.billable_hours);
}

export async function getDashboardMyTasks(
  teamMemberId: string,
): Promise<DashboardMyTasks> {
  const supabase = await createClient();
  const today = todayIso();

  const { data, error } = await pm(supabase)
    .from("tasks")
    .select(
      `
      id,
      title,
      priority,
      due_date,
      project:projects(name)
    `,
    )
    .eq("assignee_id", teamMemberId)
    .is("parent_task_id", null)
    .in("status", OPEN_STATUSES)
    .not("due_date", "is", null)
    .lte("due_date", today)
    .order("due_date", { ascending: true });

  if (error) throw new Error(error.message);

  const overdue: DashboardMyTasks["overdue"] = [];
  const todayTasks: DashboardMyTasks["today"] = [];

  for (const row of data ?? []) {
    if (!row.due_date) continue;

    const task = {
      id: row.id,
      title: row.title,
      priority: row.priority,
      project_name: row.project?.name ?? "—",
      due_date: row.due_date,
    };

    if (row.due_date < today) {
      overdue.push(task);
    } else if (row.due_date === today) {
      todayTasks.push(task);
    }
  }

  return { overdue, today: todayTasks };
}
