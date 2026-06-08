import { INTERACTION_TYPES } from "@/lib/interactions/constants";
import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

export const clientInteractionFiltersSchema = z.object({
  type: z.preprocess(emptyToUndefined, z.enum(INTERACTION_TYPES).optional()),
  from: z.preprocess(emptyToUndefined, z.string().optional()),
  to: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const interactionListFiltersSchema = z.object({
  type: z.preprocess(emptyToUndefined, z.enum(INTERACTION_TYPES).optional()),
  client: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  from: z.preprocess(emptyToUndefined, z.string().optional()),
  to: z.preprocess(emptyToUndefined, z.string().optional()),
  q: z.preprocess(emptyToUndefined, z.string().optional()),
});
