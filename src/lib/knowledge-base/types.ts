import type { Json } from "@/lib/types";

export const KB_BLOCK_TYPES = [
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "bullet_list",
  "numbered_list",
  "image",
  "link",
  "code",
  "divider",
] as const;

export type KbBlockType = (typeof KB_BLOCK_TYPES)[number];

export type KbBlock = {
  id: string;
  type: KbBlockType;
  /** Primary text: paragraph, headings, code, link URL */
  content?: string;
  /** Link label */
  text?: string;
  /** List items */
  items?: string[];
  /** Image storage path or URL */
  src?: string;
  alt?: string;
};

export type KbCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  article_count?: number;
};

export type KbArticleListRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  updated_at: string;
  category_slug: string;
  category_name: string;
};

export type KbArticleDetail = {
  id: string;
  title: string;
  slug: string;
  content: KbBlock[];
  excerpt: string | null;
  is_published: boolean;
  updated_at: string;
  created_at: string;
  category_id: string | null;
  category_slug: string;
  category_name: string;
  updated_by_name: string | null;
};

export type KbArticleVersionRow = {
  id: string;
  title: string;
  created_at: string;
  changed_by_name: string | null;
};

export type KbSearchResult = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category_slug: string;
  category_name: string;
  snippet: string;
};

export function parseKbBlocks(raw: Json | null | undefined): KbBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((block): block is KbBlock => {
    if (!block || typeof block !== "object" || Array.isArray(block)) return false;
    const type = (block as KbBlock).type;
    return typeof type === "string" && KB_BLOCK_TYPES.includes(type as KbBlockType);
  });
}

export function serializeKbBlocks(blocks: KbBlock[]): Json {
  return blocks as unknown as Json;
}
