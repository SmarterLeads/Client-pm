import type { ProjectStatus, RagStatus, TaskStatus } from "@/lib/types";

export type PortalProjectCard = {
  id: string;
  name: string;
  status: ProjectStatus;
  rag_status: RagStatus;
  due_date: string | null;
};

export type PortalUpcomingMilestone = {
  id: string;
  title: string;
  target_date: string;
  project_id: string;
  project_name: string;
  completed: boolean;
};

export type PortalProjectListRow = {
  id: string;
  name: string;
  status: ProjectStatus;
  rag_status: RagStatus;
  due_date: string | null;
  total_milestones: number;
  completed_milestones: number;
};

export type PortalProjectDetail = PortalProjectCard & {
  description: string | null;
};

export type PortalMilestoneRow = {
  id: string;
  title: string;
  target_date: string | null;
  completed: boolean;
  approved_by_client: boolean;
};

export type PortalTaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  section_id: string | null;
};

export type PortalSectionWithTasks = {
  id: string;
  name: string;
  display_order: number;
  tasks: PortalTaskRow[];
};
