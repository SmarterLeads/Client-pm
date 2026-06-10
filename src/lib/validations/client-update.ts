import { z } from "zod";
import { normalizeRichTextHtml } from "@/lib/rich-text";

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

export const clientUpdateFiltersSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  channel: z.string().max(200).optional(),
  loggedBy: z.string().uuid().optional(),
});

export const createClientUpdateSchema = z
  .object({
    marketing_channel: z.string().trim().min(1, "Select a marketing channel"),
    other_detail: z
      .preprocess(
        emptyToNull,
        z.union([z.string().trim().max(200), z.null()]).optional(),
      )
      .optional(),
    summary: z.preprocess(
      (value) =>
        typeof value === "string" ? normalizeRichTextHtml(value) : value,
      z.string().min(1, "Summary is required"),
    ),
    occurred_at: z.string().min(1, "Date and time are required"),
  })
  .superRefine((data, ctx) => {
    if (data.marketing_channel === "other" && !data.other_detail?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Specify the update type",
        path: ["other_detail"],
      });
    }
  });
