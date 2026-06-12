import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

export const credentialFormSchema = z.object({
  platform: z.string().trim().min(1, "Platform is required").max(200),
  url: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(2000), z.null()]).optional(),
    )
    .optional(),
  username: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(500), z.null()]).optional(),
    )
    .optional(),
  password: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(2000), z.null()]).optional(),
    )
    .optional(),
  notes: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(10000), z.null()]).optional(),
    )
    .optional(),
});

export type CredentialFormInput = z.infer<typeof credentialFormSchema>;
