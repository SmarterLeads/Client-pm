import type { TaskPriority, TeamMemberRole } from "@/lib/types";

export type TeamWorkloadMember = {
  id: string;
  name: string;
  role: TeamMemberRole;
  avatar_url: string | null;
  agency_name: string | null;
  capacity_hours: number;
  estimated_hours_remaining: number;
  is_available: boolean;
  open_tasks: number;
  overdue_tasks: number;
};

export type MemberTaskRow = {
  id: string;
  title: string;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string;
  project_name: string;
};

export type MemberTasksByProject = {
  project_id: string;
  project_name: string;
  tasks: MemberTaskRow[];
};
