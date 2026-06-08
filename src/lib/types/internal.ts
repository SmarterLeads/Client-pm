import type {
  ProjectMemberRole,
  ProjectStatus,
  RagStatus,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

export const MeetingTypes = [
  "team_meeting",
  "one_on_one",
  "standup",
  "planning",
  "retrospective",
  "training",
  "other",
] as const;

export type MeetingType = (typeof MeetingTypes)[number];

export const MeetingVisibilities = [
  "all",
  "admin_only",
  "participants",
] as const;

export type MeetingVisibility = (typeof MeetingVisibilities)[number];

export type InternalProject = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  rag_status: RagStatus;
  owner_id: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type InternalProjectSection = {
  id: string;
  project_id: string;
  name: string;
  display_order: number;
  created_at: string;
};

export type InternalProjectMember = {
  id: string;
  project_id: string;
  team_member_id: string;
  role: ProjectMemberRole;
  joined_at: string;
};

export type InternalMilestone = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InternalTask = {
  id: string;
  project_id: string;
  section_id: string | null;
  parent_task_id: string | null;
  assignee_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  estimated_hours: number | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamMeeting = {
  id: string;
  title: string;
  type: MeetingType;
  summary: string | null;
  body: string | null;
  occurred_at: string;
  created_by: string;
  visibility: MeetingVisibility;
  created_at: string;
  updated_at: string;
};

export type MeetingParticipant = {
  id: string;
  meeting_id: string;
  team_member_id: string;
  created_at: string;
};

export const meetingTypeLabels: Record<MeetingType, string> = {
  team_meeting: "Team meeting",
  one_on_one: "1-on-1",
  standup: "Standup",
  planning: "Planning",
  retrospective: "Retrospective",
  training: "Training",
  other: "Other",
};

export const meetingVisibilityLabels: Record<MeetingVisibility, string> = {
  all: "Everyone",
  admin_only: "Admins only",
  participants: "Participants only",
};
