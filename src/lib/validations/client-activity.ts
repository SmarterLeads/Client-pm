import { ACTIVITY_EVENT_CATEGORIES } from "@/lib/clients/activity-log";
import { z } from "zod";

export const clientActivityFiltersSchema = z.object({
  activity_types: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .filter((item): item is (typeof ACTIVITY_EVENT_CATEGORIES)[number] =>
              ACTIVITY_EVENT_CATEGORIES.includes(
                item as (typeof ACTIVITY_EVENT_CATEGORIES)[number],
              ),
            )
        : undefined,
    ),
  activity_from: z.string().date().optional(),
  activity_to: z.string().date().optional(),
  activity_by: z.string().uuid().optional(),
});
