import { PmEnumValues } from "@/lib/types/enums";
import { z } from "zod";

const taskPriorities = PmEnumValues.task_priority;

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(5000), z.null()]).optional(),
    )
    .optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(5000), z.null()]).optional(),
    )
    .optional(),
  is_active: z.boolean().optional(),
});

export const createTemplateSectionSchema = z.object({
  template_id: z.string().uuid(),
  name: z.string().trim().min(1, "Section name is required").max(200),
  display_order: z.coerce.number().int().min(0).optional(),
});

export const updateTemplateSectionSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  display_order: z.coerce.number().int().min(0).optional(),
});

export const createTemplateTaskSchema = z.object({
  template_id: z.string().uuid(),
  section_id: z.string().uuid(),
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
  estimated_hours: z
    .preprocess(
      emptyToNull,
      z.union([z.coerce.number().min(0).max(10000), z.null()]).optional(),
    )
    .optional(),
  days_from_start: z
    .preprocess(
      emptyToNull,
      z.union([z.coerce.number().int().min(0).max(3650), z.null()]).optional(),
    )
    .optional(),
  display_order: z.coerce.number().int().min(0).optional(),
});

export const updateTemplateTaskSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
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
  estimated_hours: z
    .preprocess(
      emptyToNull,
      z.union([z.coerce.number().min(0).max(10000), z.null()]).optional(),
    )
    .optional(),
  days_from_start: z
    .preprocess(
      emptyToNull,
      z.union([z.coerce.number().int().min(0).max(3650), z.null()]).optional(),
    )
    .optional(),
  section_id: z.string().uuid().optional(),
  parent_task_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid(), z.null()]).optional(),
    )
    .optional(),
  display_order: z.coerce.number().int().min(0).optional(),
});
