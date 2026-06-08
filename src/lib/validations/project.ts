import { PmEnumValues } from "@/lib/types/enums";
import { z } from "zod";

const projectStatuses = PmEnumValues.project_status;
const ragStatuses = PmEnumValues.rag_status;
const memberRoles = PmEnumValues.project_member_role;

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(200),
  client_id: z.string().uuid("Select a client"),
  owner_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid("Invalid owner"), z.null()]).optional(),
    )
    .optional(),
  description: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(5000), z.null()]).optional(),
    )
    .optional(),
  status: z.enum(projectStatuses),
  rag_status: z.enum(ragStatuses),
  start_date: z
    .preprocess(
      emptyToNull,
      z.union([z.string().date("Invalid start date"), z.null()]).optional(),
    )
    .optional(),
  due_date: z
    .preprocess(
      emptyToNull,
      z.union([z.string().date("Invalid due date"), z.null()]).optional(),
    )
    .optional(),
  template_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid(), z.null()]).optional(),
    )
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const projectListFiltersSchema = z.object({
  q: z.string().optional(),
  status: z.enum(projectStatuses).optional(),
  client: z.string().uuid().optional(),
  owner: z.string().uuid().optional(),
});

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(5000), z.null()]).optional(),
    )
    .optional(),
  target_date: z
    .preprocess(
      emptyToNull,
      z.union([z.string().date("Invalid date"), z.null()]).optional(),
    )
    .optional(),
});

export const addProjectMemberSchema = z.object({
  team_member_id: z.string().uuid("Select a team member"),
  role: z.enum(memberRoles),
});

export const moveTaskSectionSchema = z.object({
  task_id: z.string().uuid(),
  section_id: z.string().uuid(),
});
