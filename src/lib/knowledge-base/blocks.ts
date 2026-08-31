import type { KbBlock } from "@/lib/knowledge-base/types";
import { plainTextFromBlocks } from "@/lib/knowledge-base/html-content";
import { parseKbBlocks } from "@/lib/knowledge-base/types";

function newBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createEmptyBlock(type: KbBlock["type"] = "paragraph"): KbBlock {
  const id = newBlockId();
  switch (type) {
    case "bullet_list":
    case "numbered_list":
      return { id, type, items: [""] };
    case "divider":
      return { id, type };
    case "image":
      return { id, type, src: "", alt: "" };
    case "link":
      return { id, type, content: "", text: "" };
    case "html":
      return { id, type, content: "<p></p>" };
    default:
      return { id, type, content: "" };
  }
}

export function blocksToPlainText(blocks: KbBlock[]): string {
  return plainTextFromBlocks(blocks);
}

export function generateKbExcerpt(blocks: KbBlock[], maxLength = 200): string {
  const text = blocksToPlainText(blocks).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

export function extractSearchSnippet(
  title: string,
  excerpt: string | null,
  content: unknown,
  query: string,
  radius = 80,
): string {
  const q = query.trim().toLowerCase();
  const haystack = [title, excerpt ?? "", blocksToPlainText(parseKbBlocks(content as never))]
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();

  if (!q) return excerpt ?? haystack.slice(0, radius);

  const index = haystack.toLowerCase().indexOf(q);
  if (index === -1) return excerpt ?? haystack.slice(0, radius);

  const start = Math.max(0, index - radius / 2);
  const end = Math.min(haystack.length, index + q.length + radius / 2);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < haystack.length ? "…" : "";
  return `${prefix}${haystack.slice(start, end).trim()}${suffix}`;
}

export function slugifyKb(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (slug || "article").slice(0, 100);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightMatches(text: string, query: string): string {
  const q = query.trim();
  if (!q) return text;
  const pattern = new RegExp(`(${escapeRegExp(q)})`, "gi");
  return text.replace(pattern, "<mark>$1</mark>");
}
