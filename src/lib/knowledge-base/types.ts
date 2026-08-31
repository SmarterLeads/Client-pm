import {
  blocksToPlainTextForExpansion,
  plainTextToKbBlocks,
  shouldExpandPlainTextBlocks,
} from "@/lib/knowledge-base/parse-plain-text";
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
  "html",
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
  updated_by_name: string | null;
  updated_by_avatar_url: string | null;
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

const KB_BLOCK_TYPE_ALIASES: Record<string, KbBlockType> = {
  heading_1: "heading1",
  heading_2: "heading2",
  heading_3: "heading3",
  h1: "heading1",
  h2: "heading2",
  h3: "heading3",
  numberedList: "numbered_list",
  bulletList: "bullet_list",
  ordered_list: "numbered_list",
  unordered_list: "bullet_list",
  text: "paragraph",
};

function normalizeKbBlockType(type: string): KbBlockType | null {
  if (KB_BLOCK_TYPES.includes(type as KbBlockType)) {
    return type as KbBlockType;
  }
  return KB_BLOCK_TYPE_ALIASES[type] ?? null;
}

function normalizeKbBlock(raw: unknown): KbBlock | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const candidate = raw as Record<string, unknown>;
  const typeValue = candidate.type;
  if (typeof typeValue !== "string") return null;

  const type = normalizeKbBlockType(typeValue);
  if (!type) return null;

  const id =
    typeof candidate.id === "string" && candidate.id.trim()
      ? candidate.id
      : typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const block: KbBlock = { id, type };

  if (typeof candidate.content === "string") block.content = candidate.content;
  if (typeof candidate.text === "string") block.text = candidate.text;
  if (typeof candidate.src === "string") block.src = candidate.src;
  if (typeof candidate.alt === "string") block.alt = candidate.alt;
  if (Array.isArray(candidate.items)) {
    block.items = candidate.items.filter((item): item is string => typeof item === "string");
  }

  return block;
}

export function parseKbBlocks(raw: Json | null | undefined): KbBlock[] {
  if (raw == null) return [];

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as Json;
      if (parsed !== raw) return parseKbBlocks(parsed);
    } catch {
      return plainTextToKbBlocks(raw);
    }
    return plainTextToKbBlocks(raw);
  }

  if (!Array.isArray(raw)) return [];

  const blocks = raw
    .map((block) => normalizeKbBlock(block))
    .filter((block): block is KbBlock => block !== null);

  if (shouldExpandPlainTextBlocks(blocks)) {
    return plainTextToKbBlocks(blocksToPlainTextForExpansion(blocks));
  }

  if (blocks.length === 0 && raw.length > 0) {
    const fallbackText = raw
      .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
      .map((entry) => {
        const record = entry as Record<string, unknown>;
        return typeof record.content === "string" ? record.content : "";
      })
      .filter(Boolean)
      .join("\n\n");

    if (fallbackText.trim()) {
      return plainTextToKbBlocks(fallbackText);
    }
  }

  return blocks;
}

export function serializeKbBlocks(blocks: KbBlock[]): Json {
  return blocks as unknown as Json;
}
