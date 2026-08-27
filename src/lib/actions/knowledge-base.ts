"use server";

import { randomUUID } from "crypto";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTeamMember } from "@/lib/auth/session";
import { canManageKnowledgeBase } from "@/lib/knowledge-base/access";
import {
  generateKbExcerpt,
  slugifyKb,
} from "@/lib/knowledge-base/blocks";
import {
  serializeKbBlocks,
  type KbBlock,
} from "@/lib/knowledge-base/types";
import { searchKbArticles } from "@/lib/queries/knowledge-base";
import type { KbArticleUpdate } from "@/lib/types";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ATTACHMENTS_BUCKET, ensureAttachmentsBucket } from "@/lib/storage";
import {
  createKbArticleSchema,
  createKbCategorySchema,
  deleteKbArticleSchema,
  deleteKbCategorySchema,
  reorderKbCategoriesSchema,
  updateKbArticleSchema,
  updateKbCategorySchema,
} from "@/lib/validations/knowledge-base";

async function requireKbEditor() {
  const teamMember = await getTeamMember();
  if (!teamMember || !canManageKnowledgeBase(teamMember)) {
    throw new Error("You do not have permission to edit the knowledge base.");
  }
  return teamMember;
}

function revalidateKbPaths(
  categorySlug?: string,
  articleSlug?: string,
) {
  revalidatePath("/knowledge-base");
  if (categorySlug) {
    revalidatePath(`/knowledge-base/${categorySlug}`);
  }
  if (categorySlug && articleSlug) {
    revalidatePath(`/knowledge-base/${categorySlug}/${articleSlug}`);
    revalidatePath(`/knowledge-base/${categorySlug}/${articleSlug}/edit`);
  }
}

async function uniqueArticleSlug(
  supabase: ReturnType<typeof createServiceClient>,
  base: string,
  excludeId?: string,
) {
  let slug = slugifyKb(base);
  let suffix = 1;

  while (true) {
    let query = pm(supabase).from("kb_articles").select("id").eq("slug", slug);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    slug = `${slugifyKb(base).slice(0, 90)}-${suffix}`;
    suffix += 1;
  }
}

async function uniqueCategorySlug(
  supabase: ReturnType<typeof createServiceClient>,
  base: string,
  excludeId?: string,
) {
  let slug = slugifyKb(base);
  let suffix = 1;

  while (true) {
    let query = pm(supabase)
      .from("kb_categories")
      .select("id")
      .eq("slug", slug);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    slug = `${slugifyKb(base).slice(0, 90)}-${suffix}`;
    suffix += 1;
  }
}

async function saveArticleVersion(
  supabase: ReturnType<typeof createServiceClient>,
  articleId: string,
  title: string,
  content: KbBlock[],
  changedBy: string,
) {
  const { error } = await pm(supabase).from("kb_article_versions").insert({
    article_id: articleId,
    title,
    content: serializeKbBlocks(content),
    changed_by: changedBy,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function searchKnowledgeBase(query: string) {
  await getTeamMember();
  return searchKbArticles(query);
}

export async function createCategory(
  input: Record<string, unknown>,
): Promise<{ error?: string; categoryId?: string }> {
  try {
    await requireKbEditor();
    const parsed = createKbCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const supabase = createServiceClient();
    const { data: last } = await pm(supabase)
      .from("kb_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);

    const slug = await uniqueCategorySlug(supabase, parsed.data.name);
    const { data, error } = await pm(supabase)
      .from("kb_categories")
      .insert({
        name: parsed.data.name,
        slug,
        description: parsed.data.description ?? null,
        sort_order: (last?.[0]?.sort_order ?? -1) + 1,
      })
      .select("id, slug")
      .single();

    if (error) return { error: error.message };

    revalidateKbPaths();
    return { categoryId: data.id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create category.",
    };
  }
}

export async function updateCategory(
  input: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    await requireKbEditor();
    const parsed = updateKbCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const supabase = createServiceClient();
    const { data: existing, error: fetchError } = await pm(supabase)
      .from("kb_categories")
      .select("slug, name")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (fetchError) return { error: fetchError.message };
    if (!existing) return { error: "Category not found." };

    const slug =
      parsed.data.name !== existing.name
        ? await uniqueCategorySlug(supabase, parsed.data.name, parsed.data.id)
        : existing.slug;

    const { error } = await pm(supabase)
      .from("kb_categories")
      .update({
        name: parsed.data.name,
        slug,
        description: parsed.data.description ?? null,
      })
      .eq("id", parsed.data.id);

    if (error) return { error: error.message };

    revalidateKbPaths(existing.slug);
    revalidateKbPaths(slug);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update category.",
    };
  }
}

export async function reorderCategories(
  orderedIds: string[],
): Promise<{ error?: string }> {
  try {
    await requireKbEditor();
    const parsed = reorderKbCategoriesSchema.safeParse({ orderedIds });
    if (!parsed.success) {
      return { error: "Invalid category order." };
    }

    const supabase = createServiceClient();
    for (const [index, id] of parsed.data.orderedIds.entries()) {
      const { error } = await pm(supabase)
        .from("kb_categories")
        .update({ sort_order: index })
        .eq("id", id);
      if (error) return { error: error.message };
    }

    revalidateKbPaths();
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to reorder categories.",
    };
  }
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  try {
    await requireKbEditor();
    const parsed = deleteKbCategorySchema.safeParse({ id });
    if (!parsed.success) {
      return { error: "Invalid category." };
    }

    const supabase = createServiceClient();
    const { count, error: countError } = await pm(supabase)
      .from("kb_articles")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if (countError) return { error: countError.message };
    if ((count ?? 0) > 0) {
      return { error: "Remove or move articles before deleting this category." };
    }

    const { data: category } = await pm(supabase)
      .from("kb_categories")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    const { error } = await pm(supabase)
      .from("kb_categories")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateKbPaths(category?.slug);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete category.",
    };
  }
}

export async function createArticle(
  input: Record<string, unknown>,
): Promise<{ error?: string; redirectTo?: string }> {
  try {
    const teamMember = await requireKbEditor();
    const parsed = createKbArticleSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const supabase = createServiceClient();
    const slug = await uniqueArticleSlug(
      supabase,
      parsed.data.slug?.trim() || parsed.data.title,
    );

    const { data: category, error: categoryError } = await pm(supabase)
      .from("kb_categories")
      .select("slug")
      .eq("id", parsed.data.categoryId)
      .maybeSingle();

    if (categoryError) return { error: categoryError.message };
    if (!category) return { error: "Category not found." };

    const initialBlocks: KbBlock[] = [
      { id: randomUUID(), type: "paragraph", content: "" },
    ];

    const { data, error } = await pm(supabase)
      .from("kb_articles")
      .insert({
        category_id: parsed.data.categoryId,
        title: parsed.data.title,
        slug,
        content: serializeKbBlocks(initialBlocks),
        excerpt: "",
        created_by: teamMember.id,
        updated_by: teamMember.id,
      })
      .select("slug")
      .single();

    if (error) return { error: error.message };

    revalidateKbPaths(category.slug, data.slug);
    redirect(`/knowledge-base/${category.slug}/${data.slug}/edit`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return {
      error: err instanceof Error ? err.message : "Failed to create article.",
    };
  }
}

export async function updateArticle(
  input: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireKbEditor();
    const parsed = updateKbArticleSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const supabase = createServiceClient();
    const { data: existing, error: fetchError } = await pm(supabase)
      .from("kb_articles")
      .select(
        "id, title, slug, content, category_id, kb_categories!inner(slug)",
      )
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (fetchError) return { error: fetchError.message };
    if (!existing) return { error: "Article not found." };

    const oldCategorySlug = (existing.kb_categories as { slug: string }).slug;
    const nextTitle = parsed.data.title ?? existing.title;
    const nextContent = parsed.data.content
      ? parsed.data.content
      : undefined;

    if (nextContent) {
      await saveArticleVersion(
        supabase,
        existing.id,
        nextTitle,
        nextContent,
        teamMember.id,
      );
    }

    const payload: KbArticleUpdate = {
      updated_by: teamMember.id,
    };

    if (parsed.data.title !== undefined) payload.title = parsed.data.title;
    if (parsed.data.categoryId !== undefined) {
      payload.category_id = parsed.data.categoryId;
    }
    if (parsed.data.isPublished !== undefined) {
      payload.is_published = parsed.data.isPublished;
    }
    if (nextContent) {
      payload.content = serializeKbBlocks(nextContent);
      payload.excerpt = generateKbExcerpt(nextContent);
    }
    if (parsed.data.slug !== undefined || parsed.data.title !== undefined) {
      payload.slug = await uniqueArticleSlug(
        supabase,
        parsed.data.slug?.trim() || nextTitle,
        existing.id,
      );
    }

    const { data: saved, error } = await pm(supabase)
      .from("kb_articles")
      .update(payload)
      .eq("id", parsed.data.id)
      .select("slug, kb_categories!inner(slug)")
      .single();

    if (error) return { error: error.message };

    const newCategorySlug = (saved.kb_categories as { slug: string }).slug;
    revalidateKbPaths(oldCategorySlug, existing.slug);
    revalidateKbPaths(newCategorySlug, saved.slug);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update article.",
    };
  }
}

export async function deleteArticle(id: string): Promise<{ error?: string }> {
  try {
    await requireKbEditor();
    const parsed = deleteKbArticleSchema.safeParse({ id });
    if (!parsed.success) return { error: "Invalid article." };

    const supabase = createServiceClient();
    const { data: existing } = await pm(supabase)
      .from("kb_articles")
      .select("slug, kb_categories!inner(slug)")
      .eq("id", id)
      .maybeSingle();

    const { error } = await pm(supabase)
      .from("kb_articles")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };

    if (existing) {
      const categorySlug = (existing.kb_categories as { slug: string }).slug;
      revalidateKbPaths(categorySlug, existing.slug);
    } else {
      revalidateKbPaths();
    }
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete article.",
    };
  }
}

export async function uploadKbImage(
  formData: FormData,
): Promise<{ error?: string; src?: string }> {
  try {
    await requireKbEditor();
    const file = formData.get("file");
    const articleId = formData.get("articleId");

    if (!(file instanceof File) || !file.size) {
      return { error: "No file provided." };
    }
    if (typeof articleId !== "string" || !articleId.trim()) {
      return { error: "Article ID is required." };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { error: "Image must be under 10 MB." };
    }

    await ensureAttachmentsBucket();
    const supabase = createServiceClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `kb/${articleId}/${randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) return { error: uploadError.message };

    const { data } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    return { src: data?.signedUrl ?? storagePath };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to upload image.",
    };
  }
}

export async function getKbImageUrl(
  storagePath: string,
): Promise<{ error?: string; url?: string }> {
  try {
    await getTeamMember();
    if (storagePath.startsWith("http")) {
      return { url: storagePath };
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, 3600);

    if (error || !data?.signedUrl) {
      return { error: error?.message ?? "Failed to load image." };
    }
    return { url: data.signedUrl };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to load image.",
    };
  }
}
