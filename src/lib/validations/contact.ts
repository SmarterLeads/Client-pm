import { z } from "zod";

export const contactListFiltersSchema = z.object({
  q: z.string().optional(),
  agency: z.string().uuid().optional(),
  client: z.string().uuid().optional(),
  primary: z.enum(["true", "false"]).optional(),
});

export type ContactListFiltersInput = z.input<typeof contactListFiltersSchema>;

export type ContactListFilters = {
  q?: string;
  agency?: string;
  client?: string;
  primary?: boolean;
};

export function parseContactListFilters(
  input: ContactListFiltersInput,
): ContactListFilters {
  return {
    q: input.q,
    agency: input.agency,
    client: input.client,
    primary: input.primary === "true" ? true : undefined,
  };
}
