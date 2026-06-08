import { PmEnumValues } from "@/lib/types/enums";
import { z } from "zod";

const interactionTypes = PmEnumValues.interaction_type;

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

export const clientInteractionFiltersSchema = z.object({
  type: z.preprocess(emptyToUndefined, z.enum(interactionTypes).optional()),
  from: z.preprocess(emptyToUndefined, z.string().optional()),
  to: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const interactionListFiltersSchema = z.object({
  type: z.preprocess(emptyToUndefined, z.enum(interactionTypes).optional()),
  client: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  from: z.preprocess(emptyToUndefined, z.string().optional()),
  to: z.preprocess(emptyToUndefined, z.string().optional()),
  q: z.preprocess(emptyToUndefined, z.string().optional()),
});
