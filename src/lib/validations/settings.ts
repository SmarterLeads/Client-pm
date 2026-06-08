import { PmEnumValues } from "@/lib/types/enums";
import { z } from "zod";

const teamRoles = PmEnumValues.team_member_role;

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

export const inviteTeamMemberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Invalid email"),
  role: z.enum(teamRoles),
  agency_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid("Invalid agency"), z.null()]).optional(),
    )
    .optional(),
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
  role: z.enum(teamRoles),
});
