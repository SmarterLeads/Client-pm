import type { Database } from "./database";

type PmEnums = Database["pm"]["Enums"];

/**
 * Runtime pm schema enum value arrays for forms, zod, and filters.
 * Kept in a small module so client components do not depend on database.ts.
 */
export const PmEnumValues = {
  access_level: ["viewer", "approver", "collaborator"],
  change_action: ["insert", "update", "delete"],
  interaction_channel: [
    "phone",
    "email",
    "video",
    "in_person",
    "slack",
    "sms",
  ],
  interaction_type: [
    "call",
    "email",
    "meeting",
    "note",
    "demo",
    "support",
    "check_in",
    "report",
    "quote",
  ],
  notification_type: [
    "task_assigned",
    "task_due",
    "comment_mention",
    "task_complete",
    "milestone_due",
    "approval_needed",
    "milestone_approved",
  ],
  project_member_role: ["lead", "contributor", "reviewer", "observer"],
  project_status: [
    "planned",
    "active",
    "on_hold",
    "completed",
    "cancelled",
  ],
  rag_status: ["red", "amber", "green"],
  task_priority: ["low", "medium", "high", "urgent"],
  task_status: [
    "backlog",
    "todo",
    "in_progress",
    "in_review",
    "done",
    "cancelled",
  ],
  team_member_role: ["admin", "manager", "member", "agency_contact"],
} as const satisfies {
  [K in keyof PmEnums]: readonly PmEnums[K][];
};
