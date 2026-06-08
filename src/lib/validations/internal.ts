import { PmEnumValues } from "@/lib/types/enums";
import {
  MeetingTypes,
  MeetingVisibilities,
} from "@/lib/types/internal";
import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

export const internalProjectListFiltersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(PmEnumValues.project_status).optional(),
  owner: z.string().uuid().optional(),
});

export const createInternalProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(500),
  description: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(10000), z.null()]).optional(),
    )
    .optional(),
  owner_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid(), z.null()]).optional(),
    )
    .optional(),
  status: z.enum(PmEnumValues.project_status).default("planned"),
  rag_status: z.enum(PmEnumValues.rag_status).default("green"),
  start_date: z
    .preprocess(
      emptyToNull,
      z.union([z.string().date(), z.null()]).optional(),
    )
    .optional(),
  due_date: z
    .preprocess(
      emptyToNull,
      z.union([z.string().date(), z.null()]).optional(),
    )
    .optional(),
});

export const updateInternalProjectSchema = createInternalProjectSchema
  .partial()
  .extend({
    name: z.string().trim().min(1).max(500).optional(),
  });

export const createInternalSectionSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().trim().min(1, "Section name is required").max(200),
});

export const createInternalTaskSchema = z.object({
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
  priority: z.enum(PmEnumValues.task_priority).optional(),
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
  status: z.enum(PmEnumValues.task_status).default("todo"),
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

export const updateInternalTaskSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(10000), z.null()]).optional(),
    )
    .optional(),
  status: z.enum(PmEnumValues.task_status).optional(),
  priority: z.enum(PmEnumValues.task_priority).optional(),
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

export const moveInternalTaskSectionSchema = z.object({
  task_id: z.string().uuid(),
  section_id: z.string().uuid(),
});

export const createMeetingSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  type: z.enum(MeetingTypes).default("team_meeting"),
  occurred_at: z.string().datetime({ offset: true }),
  summary: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(2000), z.null()]).optional(),
    )
    .optional(),
  body: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(50000), z.null()]).optional(),
    )
    .optional(),
  visibility: z.enum(MeetingVisibilities).default("all"),
  participant_ids: z.array(z.string().uuid()).optional(),
});

export const updateMeetingSchema = createMeetingSchema.partial().extend({
  title: z.string().trim().min(1).max(500).optional(),
});

export const meetingFiltersSchema = z.object({
  type: z.enum(MeetingTypes).optional(),
  visibility: z.enum(MeetingVisibilities).optional(),
  participant: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export type InternalProjectListFilters = z.infer<
  typeof internalProjectListFiltersSchema
>;
export type MeetingFilters = z.infer<typeof meetingFiltersSchema>;
