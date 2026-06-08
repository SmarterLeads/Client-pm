import { PmEnumValues } from "@/lib/types/enums";
import { z } from "zod";

const taskStatuses = PmEnumValues.task_status;
const taskPriorities = PmEnumValues.task_priority;

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

export const createTaskSchema = z.object({
  project_id: z.string().uuid(),
  section_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid(), z.null()]).optional(),
    )
    .optional(),
  parent_task_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid(), z.null()]).optional(),
    )
    .optional(),
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(10000), z.null()]).optional(),
    )
    .optional(),
  priority: z.enum(taskPriorities).optional(),
  assignee_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid(), z.null()]).optional(),
    )
    .optional(),
  due_date: z
    .preprocess(
      emptyToNull,
      z.union([z.string().date(), z.null()]).optional(),
    )
    .optional(),
  estimated_hours: z
    .preprocess(
      emptyToNull,
      z.union([z.coerce.number().min(0).max(10000), z.null()]).optional(),
    )
    .optional(),
  status: z.enum(taskStatuses).default("todo"),
  is_recurring: z
    .preprocess((v) => v === "true" || v === true, z.boolean())
    .optional(),
  recurrence_rule: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(2000), z.null()]).optional(),
    )
    .optional(),
});

export const quickAddTaskSchema = z.object({
  project_id: z.string().uuid(),
  section_id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(500),
  priority: z.enum(taskPriorities).optional(),
  assignee_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid(), z.null()]).optional(),
    )
    .optional(),
  due_date: z
    .preprocess(
      emptyToNull,
      z.union([z.string().date(), z.null()]).optional(),
    )
    .optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(10000), z.null()]).optional(),
    )
    .optional(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  assignee_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid(), z.null()]).optional(),
    )
    .optional(),
  due_date: z
    .preprocess(
      emptyToNull,
      z.union([z.string().date(), z.null()]).optional(),
    )
    .optional(),
  section_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid(), z.null()]).optional(),
    )
    .optional(),
  estimated_hours: z
    .preprocess(
      emptyToNull,
      z.union([z.coerce.number().min(0).max(10000), z.null()]).optional(),
    )
    .optional(),
  is_recurring: z.boolean().optional(),
  recurrence_rule: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(2000), z.null()]).optional(),
    )
    .optional(),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment is required").max(5000),
});

export const logTimeSchema = z.object({
  hours: z.coerce.number().int().min(0).max(24),
  minutes: z.coerce.number().int().min(0).max(59),
  billable: z
    .preprocess((v) => v === "true" || v === true, z.boolean())
    .optional(),
  logged_date: z.string().date(),
  description: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(2000), z.null()]).optional(),
    )
    .optional(),
}).refine((d) => d.hours > 0 || d.minutes > 0, {
  message: "Duration must be greater than zero",
  path: ["minutes"],
});

export const addDependencySchema = z.object({
  depends_on_task_id: z.string().uuid("Select a task"),
});

export const myTasksDueDateFilters = [
  "all",
  "overdue",
  "today",
  "this_week",
  "next_week",
  "no_due_date",
] as const;

export type MyTasksDueDateFilter = (typeof myTasksDueDateFilters)[number];

export const myTasksFiltersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  client: z.string().uuid().optional(),
  due: z.enum(myTasksDueDateFilters).optional(),
});
