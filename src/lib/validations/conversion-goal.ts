import { z } from "zod";

import { CONVERSION_GOAL_TYPES } from "@/lib/clients/conversion-goal-types";

export const conversionGoalPrioritySchema = z.enum(["primary", "secondary"]);
export const conversionGoalTypeSchema = z.enum(CONVERSION_GOAL_TYPES);

export const addClientConversionGoalSchema = z.object({
  clientId: z.string().uuid(),
  platform: z.string().trim().min(1).max(50),
});

export const updateClientConversionGoalSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  conversion_name: z.string().trim().min(1, "Conversion name is required").max(200).optional(),
  conversion_id: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional(),
  event_name: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional(),
  priority: conversionGoalPrioritySchema.optional(),
  conversion_type: conversionGoalTypeSchema.optional(),
  conversion_value: z.number().min(0).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const deleteClientConversionGoalSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
});
