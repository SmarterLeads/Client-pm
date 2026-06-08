import { CLIENT_STATUSES } from "@/lib/pm/constants";
import { MARKETING_CHANNEL_VALUES } from "@/lib/clients/overview-fields";
import { INTERACTION_TYPES } from "@/lib/interactions/constants";
import { PmEnumValues } from "@/lib/types/enums";
import { z } from "zod";

const ragStatuses = PmEnumValues.rag_status;
const interactionChannels = PmEnumValues.interaction_channel;

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

export const primaryContactSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(100), z.null()]).optional(),
    )
    .optional(),
  email: z
    .preprocess(
      emptyToNull,
      z.union([z.string().email("Invalid email"), z.null()]).optional(),
    )
    .optional(),
  phone: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(50), z.null()]).optional(),
    )
    .optional(),
  job_title: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(200), z.null()]).optional(),
    )
    .optional(),
});

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  agency_id: z.string().uuid("Agency is required"),
  status: z.enum(CLIENT_STATUSES),
  rag_status: z.enum(ragStatuses),
  account_manager_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid("Invalid account manager"), z.null()]).optional(),
    )
    .optional(),
  notes: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(5000), z.null()]).optional(),
    )
    .optional(),
  website_url: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(500), z.null()]).optional(),
    )
    .optional(),
  business_phone: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(50), z.null()]).optional(),
    )
    .optional(),
  primary_contact: primaryContactSchema,
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  status: z.enum(CLIENT_STATUSES),
  rag_status: z.enum(ragStatuses),
  account_manager_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid("Invalid account manager"), z.null()]).optional(),
    )
    .optional(),
  notes: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(5000), z.null()]).optional(),
    )
    .optional(),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const contactFormSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(100), z.null()]).optional(),
    )
    .optional(),
  email: z
    .preprocess(
      emptyToNull,
      z.union([z.string().email("Invalid email"), z.null()]).optional(),
    )
    .optional(),
  phone: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(50), z.null()]).optional(),
    )
    .optional(),
  job_title: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(200), z.null()]).optional(),
    )
    .optional(),
  notes: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(5000), z.null()]).optional(),
    )
    .optional(),
  preferred_contact_method: z
    .preprocess(
      emptyToNull,
      z.union([z.string(), z.null()]).optional(),
    )
    .optional(),
  is_primary: z
    .preprocess((v) => v === "true" || v === true, z.boolean().optional())
    .optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export const updateContactFieldsSchema = z.object({
  preferred_contact_method: z
    .preprocess(
      emptyToNull,
      z.union([z.string(), z.null()]).optional(),
    )
    .optional(),
});

export type UpdateContactFieldsInput = z.infer<typeof updateContactFieldsSchema>;

export const archiveClientStatusSchema = z.enum([
  "active",
  "on_hold",
  "churned",
]);

export const updateClientFieldSchema = z.object({
  status: z.enum(CLIENT_STATUSES).optional(),
  rag_status: z.enum(ragStatuses).optional(),
  account_manager_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid(), z.null()]).optional(),
    )
    .optional(),
});

export const updateMarketingBriefSchema = z.object({
  brief: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(50000), z.null()]).optional(),
    )
    .optional(),
});

const optionalText = (max: number) =>
  z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(max), z.null()]).optional(),
    )
    .optional();

export const updateMarketingChannelsSchema = z.object({
  marketing_channels: z.array(z.enum(MARKETING_CHANNEL_VALUES)),
});

export const updateClientOverviewFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    legal_name: optionalText(200),
    website_url: optionalText(500),
    business_phone: optionalText(50),
    industry: optionalText(200),
    client_type: z.enum(["ecommerce", "lead_generation"]).optional(),
    hst_number: optionalText(50),
    address_street: optionalText(300),
    address_city: optionalText(100),
    address_province: optionalText(100),
    address_postal_code: optionalText(20),
    address_country: optionalText(100),
    marketing_channels: z.array(z.enum(MARKETING_CHANNEL_VALUES)).optional(),
    tracking_setup: z
      .preprocess(
        emptyToNull,
        z
          .union([
            z.enum(["whatconverts", "ghl", "direct"]),
            z.null(),
          ])
          .optional(),
      )
      .optional(),
    ga4_id: optionalText(100),
    mrr_cents: z
      .preprocess(
        (v) => (v === null || v === "" ? null : v),
        z.union([z.number().int().min(0).max(999_999_999_99), z.null()]).optional(),
      )
      .optional(),
    mrr_breakdown: z
      .record(
        z.string(),
        z.number().int().min(0).max(999_999_999_99),
      )
      .optional(),
    currency: z.enum(["CAD", "USD"]).optional(),
    status: z.enum(CLIENT_STATUSES).optional(),
    rag_status: z.enum(ragStatuses).optional(),
    account_manager_id: z
      .preprocess(
        emptyToNull,
        z.union([z.string().uuid(), z.null()]).optional(),
      )
      .optional(),
  })
  .strict();

export const updatePlatformConnectionSchema = z.object({
  platform: z.string().trim().min(1).max(50),
  externalAccountId: optionalText(200),
});

export const createInteractionSchema = z.object({
  type: z.enum(INTERACTION_TYPES),
  channel: z
    .preprocess(
      emptyToNull,
      z.union([z.enum(interactionChannels), z.null()]).optional(),
    )
    .optional(),
  summary: z.string().trim().min(1, "Summary is required").max(500),
  body: z
    .preprocess(
      emptyToNull,
      z.union([z.string().max(10000), z.null()]).optional(),
    )
    .optional(),
  occurred_at: z.string().min(1, "Date is required"),
  contact_id: z
    .preprocess(
      emptyToNull,
      z.union([z.string().uuid(), z.null()]).optional(),
    )
    .optional(),
});

export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;

export const clientListFiltersSchema = z
  .object({
    q: z.string().optional(),
    status: z.enum(CLIENT_STATUSES).optional(),
    rag: z.enum(ragStatuses).optional(),
    agency: z.string().uuid("Invalid agency").optional(),
    agency_id: z.string().uuid("Invalid agency").optional(),
    include_inactive: z.enum(["true", "false"]).optional(),
  })
  .transform(({ agency, agency_id, include_inactive, ...rest }) => ({
    ...rest,
    agency: agency ?? agency_id,
    includeInactive: include_inactive === "true",
  }));
