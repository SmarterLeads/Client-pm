import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  blocksToPlainText,
  extractSearchSnippet,
} from "@/lib/knowledge-base/blocks";
import {
  parseKbBlocks,
  type KbArticleDetail,
  type KbArticleListRow,
  type KbArticleVersionRow,
  type KbCategoryRow,
  type KbSearchResult,
  type KbSubcategoryRow,
} from "@/lib/knowledge-base/types";
import type { AppSupabaseClient } from "@/lib/supabase/pm";

function mapCategory(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  parent_id?: string | null;
}): KbCategoryRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sort_order: row.sort_order,
    parent_id: row.parent_id ?? null,
  };
}

function mapArticleListRow(row: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  sort_order?: number;
  updated_at: string;
  subcategory_id?: string | null;
  kb_categories: { slug: string; name: string };
  subcategory?: { slug: string; name: string } | null;
  updated_by: { name: string; avatar_url: string | null } | null;
}): KbArticleListRow {
  const cat = row.kb_categories;
  const sub = row.subcategory ?? null;

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    sort_order: row.sort_order ?? 0,
    updated_at: row.updated_at,
    category_slug: cat.slug,
    category_name: cat.name,
    subcategory_id: row.subcategory_id ?? null,
    subcategory_slug: sub?.slug ?? null,
    subcategory_name: sub?.name ?? null,
    updated_by_name: row.updated_by?.name ?? null,
    updated_by_avatar_url: row.updated_by?.avatar_url ?? null,
  };
}

export async function getKbCategories(): Promise<KbCategoryRow[]> {
  const supabase = await createClient();
  const { data: categories, error } = await pm(supabase)
    .from("kb_categories")
    .select("id, name, slug, description, sort_order, parent_id")
    .is("parent_id", null)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getKbCategories]", error.message);
    return [];
  }

  const { data: counts, error: countError } = await pm(supabase)
    .from("kb_articles")
    .select("category_id")
    .eq("is_published", true);

  if (countError) {
    console.error("[getKbCategories counts]", countError.message);
  }

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    if (!row.category_id) continue;
    countMap.set(row.category_id, (countMap.get(row.category_id) ?? 0) + 1);
  }

  return (categories ?? []).map((category) => ({
    ...mapCategory(category),
    article_count: countMap.get(category.id) ?? 0,
  }));
}

export async function getKbCategoryBySlug(
  slug: string,
): Promise<KbCategoryRow | null> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("kb_categories")
    .select("id, name, slug, description, sort_order, parent_id")
    .eq("slug", slug)
    .is("parent_id", null)
    .maybeSingle();

  if (error || !data) return null;
  return mapCategory(data);
}

export async function getKbSubcategories(
  parentCategoryId: string,
): Promise<KbSubcategoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("kb_categories")
    .select("id, name, slug, parent_id, sort_order")
    .eq("parent_id", parentCategoryId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getKbSubcategories]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    parent_id: row.parent_id as string,
    sort_order: row.sort_order,
  }));
}

export async function getKbAllSubcategories(): Promise<KbSubcategoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("kb_categories")
    .select("id, name, slug, parent_id, sort_order")
    .not("parent_id", "is", null)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getKbAllSubcategories]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    parent_id: row.parent_id as string,
    sort_order: row.sort_order,
  }));
}

const KB_ARTICLE_DETAIL_SELECT = `
  id,
  title,
  slug,
  content,
  excerpt,
  is_published,
  updated_at,
  created_at,
  category_id,
  subcategory_id,
  kb_categories!kb_articles_category_id_fkey!inner(slug, name),
  updated_by:team_members!kb_articles_updated_by_fkey(name)
`;

function mapKbArticleDetailRow(data: {
  id: string;
  title: string;
  slug: string;
  content: unknown;
  excerpt: string | null;
  is_published: boolean;
  updated_at: string;
  created_at: string;
  category_id: string | null;
  subcategory_id?: string | null;
  kb_categories: { slug: string; name: string };
  updated_by: { name: string } | null;
}): KbArticleDetail {
  const category = data.kb_categories;

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    content: parseKbBlocks(data.content as never),
    excerpt: data.excerpt,
    is_published: data.is_published,
    updated_at: data.updated_at,
    created_at: data.created_at,
    category_id: data.category_id,
    subcategory_id: data.subcategory_id ?? null,
    category_slug: category.slug,
    category_name: category.name,
    updated_by_name: data.updated_by?.name ?? null,
  };
}

async function fetchKbArticleDetail(
  supabase: AppSupabaseClient,
  filters: { categoryId?: string; articleSlug: string },
): Promise<KbArticleDetail | null> {
  let query = pm(supabase)
    .from("kb_articles")
    .select(KB_ARTICLE_DETAIL_SELECT)
    .eq("slug", filters.articleSlug);

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[fetchKbArticleDetail]", error.message);
    return null;
  }

  if (!data) return null;

  return mapKbArticleDetailRow({
    ...data,
    kb_categories: data.kb_categories as { slug: string; name: string },
    updated_by: data.updated_by as { name: string } | null,
  });
}

export async function getKbArticleBySlug(
  articleSlug: string,
): Promise<KbArticleDetail | null> {
  const supabase = await createClient();
  return fetchKbArticleDetail(supabase, { articleSlug });
}

export async function getKbArticlesByCategory(
  categorySlug: string,
): Promise<{
  category: KbCategoryRow;
  subcategories: KbSubcategoryRow[];
  articles: KbArticleListRow[];
} | null> {
  const category = await getKbCategoryBySlug(categorySlug);
  if (!category) return null;

  const supabase = await createClient();
  const [subcategories, articlesResult] = await Promise.all([
    getKbSubcategories(category.id),
    pm(supabase)
      .from("kb_articles")
      .select(
        `id, title, slug, excerpt, sort_order, updated_at, subcategory_id,
        kb_categories!kb_articles_category_id_fkey!inner(slug, name),
        subcategory:kb_categories!kb_articles_subcategory_id_fkey(slug, name),
        updated_by:team_members!kb_articles_updated_by_fkey(name, avatar_url)`,
      )
      .eq("category_id", category.id)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  const { data, error } = articlesResult;

  if (error) {
    console.error("[getKbArticlesByCategory]", error.message);
    return { category, subcategories, articles: [] };
  }

  const articles = (data ?? []).map((row) =>
    mapArticleListRow({
      ...row,
      kb_categories: row.kb_categories as { slug: string; name: string },
      subcategory: row.subcategory as { slug: string; name: string } | null,
      updated_by: row.updated_by as {
        name: string;
        avatar_url: string | null;
      } | null,
    }),
  );

  return { category, subcategories, articles };
}

export async function getKbRecentArticles(
  limit = 8,
): Promise<KbArticleListRow[]> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("kb_articles")
    .select(
      `id, title, slug, excerpt, updated_at,
      kb_categories!kb_articles_category_id_fkey!inner(slug, name),
      updated_by:team_members!kb_articles_updated_by_fkey(name, avatar_url)`,
    )
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getKbRecentArticles]", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    mapArticleListRow({
      ...row,
      kb_categories: row.kb_categories as { slug: string; name: string },
      updated_by: row.updated_by as {
        name: string;
        avatar_url: string | null;
      } | null,
    }),
  );
}

export async function getKbArticleBySlugs(
  categorySlug: string,
  articleSlug: string,
): Promise<KbArticleDetail | null> {
  const category = await getKbCategoryBySlug(categorySlug);
  if (!category) {
    console.error("[getKbArticleBySlugs] category not found:", categorySlug);
    return null;
  }

  const supabase = await createClient();
  return fetchKbArticleDetail(supabase, {
    categoryId: category.id,
    articleSlug,
  });
}

export async function getKbArticleForEdit(
  categorySlug: string,
  articleSlug: string,
): Promise<KbArticleDetail | null> {
  const supabase = createServiceClient();
  const category = await getKbCategoryBySlug(categorySlug);

  if (category) {
    const match = await fetchKbArticleDetail(supabase, {
      categoryId: category.id,
      articleSlug,
    });
    if (match) return match;
  }

  return fetchKbArticleDetail(supabase, { articleSlug });
}

export async function getKbArticleForEditBySlug(
  articleSlug: string,
): Promise<KbArticleDetail | null> {
  const supabase = createServiceClient();
  return fetchKbArticleDetail(supabase, { articleSlug });
}

export async function getKbArticleVersions(
  articleId: string,
): Promise<KbArticleVersionRow[]> {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("kb_article_versions")
    .select(
      "id, title, created_at, changed_by:team_members!kb_article_versions_changed_by_fkey(name)",
    )
    .eq("article_id", articleId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[getKbArticleVersions]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    changed_by_name: (row.changed_by as { name: string } | null)?.name ?? null,
  }));
}

export async function searchKbArticles(query: string): Promise<KbSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("kb_articles")
    .select(
      "id, title, slug, excerpt, content, kb_categories!kb_articles_category_id_fkey!inner(slug, name)",
    )
    .eq("is_published", true);

  if (error) {
    console.error("[searchKbArticles]", error.message);
    return [];
  }

  const results: KbSearchResult[] = [];

  for (const row of data ?? []) {
    const category = row.kb_categories as { slug: string; name: string };
    const blocks = parseKbBlocks(row.content);
    const searchable = [row.title, row.excerpt ?? "", blocksToPlainText(blocks)]
      .join("\n")
      .toLowerCase();

    if (!searchable.includes(q)) continue;

    results.push({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      category_slug: category.slug,
      category_name: category.name,
      snippet: extractSearchSnippet(
        row.title,
        row.excerpt,
        row.content,
        query,
      ),
    });
  }

  return results.sort((a, b) => a.title.localeCompare(b.title));
}
