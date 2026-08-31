import { z } from "zod";

import { KB_BLOCK_TYPES } from "@/lib/knowledge-base/types";

const kbBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(KB_BLOCK_TYPES),
  content: z.string().optional(),
  text: z.string().optional(),
  items: z.array(z.string()).optional(),
  src: z.string().optional(),
  alt: z.string().optional(),
});

export const createKbCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(500).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const createKbSubcategorySchema = z.object({
  parentId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(120),
});

export const updateKbCategorySchema = createKbCategorySchema.extend({
  id: z.string().uuid(),
});

export const reorderKbCategoriesSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export const createKbArticleSchema = z.object({
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z.string().trim().max(120).optional(),
});

export const updateKbArticleSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  subcategoryId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().max(120).optional(),
  content: z.array(kbBlockSchema).optional(),
  isPublished: z.boolean().optional(),
});

export const deleteKbArticleSchema = z.object({
  id: z.string().uuid(),
});

export const deleteKbCategorySchema = z.object({
  id: z.string().uuid(),
});
