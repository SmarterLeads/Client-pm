import { z } from "zod";

const portalInviteAccessLevels = ["viewer", "approver"] as const;

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

export const invitePortalUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  name: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  access_level: z.enum(portalInviteAccessLevels, {
    message: "Select an access level.",
  }),
});
