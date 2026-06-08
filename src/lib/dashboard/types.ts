import type { RagStatus, TaskPriority } from "@/lib/types";

export type DashboardKpis = {
  activeClients: number;
  openTasks: number;
  overdueTasks: number;
  billableHoursThisMonth: number;
};

export type DashboardClientHealthRow = {
  id: string;
  name: string;
  rag_status: RagStatus | null;
  account_manager: string | null;
  active_projects: number;
  overdue_tasks: number;
  last_interaction_at: string | null;
};

export type DashboardTeamWorkloadRow = {
  id: string;
  name: string;
  open_tasks: number;
  overdue_tasks: number;
  capacity_hours: number;
  estimated_hours_remaining: number;
  is_available: boolean;
};

export type DashboardBillableHoursByClientRow = {
  client_id: string;
  client_name: string;
  billable_hours: number;
};

export type DashboardMyTaskRow = {
  id: string;
  title: string;
  priority: TaskPriority;
  project_name: string;
  due_date: string;
};

export type DashboardMyTasks = {
  overdue: DashboardMyTaskRow[];
  today: DashboardMyTaskRow[];
};
