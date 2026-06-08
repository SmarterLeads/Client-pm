export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Json,
} from "./database";

export { Constants } from "./database";
export { PmEnumValues } from "./enums";

import type { Database } from "./database";

type PmTables = Database["pm"]["Tables"];
type PublicTables = Database["public"]["Tables"];

export type Attachment = PmTables["attachments"]["Row"];
export type AttachmentInsert = PmTables["attachments"]["Insert"];
export type AttachmentUpdate = PmTables["attachments"]["Update"];

export type ChangeHistory = PmTables["change_history"]["Row"];
export type ChangeHistoryInsert = PmTables["change_history"]["Insert"];
export type ChangeHistoryUpdate = PmTables["change_history"]["Update"];

export type ClientUser = PmTables["client_portal_users"]["Row"];
export type ClientUserInsert = PmTables["client_portal_users"]["Insert"];
export type ClientUserUpdate = PmTables["client_portal_users"]["Update"];

export type Agency = PublicTables["agencies"]["Row"];
export type AgencyInsert = PublicTables["agencies"]["Insert"];
export type AgencyUpdate = PublicTables["agencies"]["Update"];

export type Client = PublicTables["clients"]["Row"];
export type ClientInsert = PublicTables["clients"]["Insert"];
export type ClientUpdate = PublicTables["clients"]["Update"];

export type ClientContact = PublicTables["client_contacts"]["Row"];
export type ClientContactInsert = PublicTables["client_contacts"]["Insert"];
export type ClientContactUpdate = PublicTables["client_contacts"]["Update"];

export type Interaction = PmTables["interactions"]["Row"];
export type InteractionInsert = PmTables["interactions"]["Insert"];
export type InteractionUpdate = PmTables["interactions"]["Update"];

export type Milestone = PmTables["milestones"]["Row"];
export type MilestoneInsert = PmTables["milestones"]["Insert"];
export type MilestoneUpdate = PmTables["milestones"]["Update"];

export type Notification = PmTables["notifications"]["Row"];
export type NotificationInsert = PmTables["notifications"]["Insert"];
export type NotificationUpdate = PmTables["notifications"]["Update"];

export type ProjectMember = PmTables["project_members"]["Row"];
export type ProjectMemberInsert = PmTables["project_members"]["Insert"];
export type ProjectMemberUpdate = PmTables["project_members"]["Update"];

export type ProjectSection = PmTables["project_sections"]["Row"];
export type ProjectSectionInsert = PmTables["project_sections"]["Insert"];
export type ProjectSectionUpdate = PmTables["project_sections"]["Update"];

export type Project = PmTables["projects"]["Row"];
export type ProjectInsert = PmTables["projects"]["Insert"];
export type ProjectUpdate = PmTables["projects"]["Update"];

export type TaskComment = PmTables["task_comments"]["Row"];
export type TaskCommentInsert = PmTables["task_comments"]["Insert"];
export type TaskCommentUpdate = PmTables["task_comments"]["Update"];

export type TaskDependency = PmTables["task_dependencies"]["Row"];
export type TaskDependencyInsert = PmTables["task_dependencies"]["Insert"];
export type TaskDependencyUpdate = PmTables["task_dependencies"]["Update"];

export type Task = PmTables["tasks"]["Row"];
export type TaskInsert = PmTables["tasks"]["Insert"];
export type TaskUpdate = PmTables["tasks"]["Update"];

export type TeamMember = PmTables["team_members"]["Row"];
export type TeamMemberInsert = PmTables["team_members"]["Insert"];
export type TeamMemberUpdate = PmTables["team_members"]["Update"];

export type TimeEntry = PmTables["time_entries"]["Row"];
export type TimeEntryInsert = PmTables["time_entries"]["Insert"];
export type TimeEntryUpdate = PmTables["time_entries"]["Update"];

type PmViews = Database["pm"]["Views"];

export type BillableHoursThisMonth =
  PmViews["v_billable_hours_this_month"]["Row"];
export type ClientHealth = PmViews["v_client_health"]["Row"];
export type TeamWorkload = PmViews["v_team_workload"]["Row"];

/** All pm schema enum unions (Database['pm']['Enums']). */
export type PmEnums = Database["pm"]["Enums"];

export type AccessLevel = PmEnums["access_level"];
export type ChangeAction = PmEnums["change_action"];
export type InteractionChannel = PmEnums["interaction_channel"];
export type InteractionType = PmEnums["interaction_type"];
export type NotificationType = PmEnums["notification_type"];
export type ProjectMemberRole = PmEnums["project_member_role"];
export type ProjectStatus = PmEnums["project_status"];
export type RagStatus = PmEnums["rag_status"];
export type TaskPriority = PmEnums["task_priority"];
export type TaskStatus = PmEnums["task_status"];
export type TeamMemberRole = PmEnums["team_member_role"];

/** Resolve a single pm schema enum by name. */
export type PmEnum<Name extends keyof PmEnums> = PmEnums[Name];
