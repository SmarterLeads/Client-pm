import { z } from "zod";

const inviteRoles = ["admin", "manager", "member"] as const;

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

export const inviteTeamMemberSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    email: z.string().trim().email("Invalid email"),
    role: z.enum(inviteRoles, { message: "Invalid role" }),
    can_view_mrr: z
      .preprocess(
        (value) => value === "true" || value === true,
        z.boolean().optional(),
      )
      .transform((value) => value ?? false),
    all_agencies: z
      .preprocess(
        (value) => value === "true" || value === true,
        z.boolean().optional(),
      )
      .transform((value) => value ?? false),
    agency_ids: z
      .preprocess((value) => {
        if (Array.isArray(value)) {
          return value.filter(
            (item): item is string =>
              typeof item === "string" && item.trim() !== "",
          );
        }
        if (typeof value === "string" && value.trim() !== "") {
          return [value];
        }
        return [];
      }, z.array(z.string().uuid("Invalid agency")).default([]))
      .optional(),
  })
  .refine((data) => data.all_agencies || (data.agency_ids?.length ?? 0) > 0, {
    message: "Select at least one agency",
    path: ["agency_ids"],
  });

export const updateAccountProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  avatar_url: z
    .preprocess(
      emptyToNull,
      z.union([z.string().url("Invalid URL"), z.null()]).optional(),
    )
    .optional(),
});

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const updateTeamMemberRoleSchema = z.object({
  role: z.enum(["admin", "manager", "member", "agency_contact"]),
});

export const updateTeamMemberNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
});
