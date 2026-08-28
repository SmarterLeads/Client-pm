import type { KbBlock } from "@/lib/knowledge-base/types";

function newBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function isBlank(line: string): boolean {
  return !line.trim();
}

function isNumberedListLine(line: string): boolean {
  return /^\d+\.\s+/.test(line.trim());
}

function isBulletLine(line: string): boolean {
  const trimmed = line.trim();
  return /^[-*•]\s+/.test(trimmed) || (line.startsWith("\t") && trimmed.length > 0);
}

function stripNumberedPrefix(line: string): string {
  return line.trim().replace(/^\d+\.\s+/, "");
}

function stripBulletPrefix(line: string): string {
  return line.trim().replace(/^[-*•]\s+/, "").trim();
}

function isUrlLine(line: string): boolean {
  return /^https?:\/\/\S+$/i.test(line.trim());
}

const SMALL_WORDS = new Set(["and", "or", "the", "a", "an", "to", "for", "with", "as", "in", "on", "of"]);

function isTitleCaseHeading(text: string, threshold = 0.7): boolean {
  const words = text.trim().replace(/:$/, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  const significant = words.filter((word) => !SMALL_WORDS.has(word.toLowerCase()));
  if (significant.length === 0) return words.length <= 3;

  const capitalized = significant.filter((word) => /^[A-Z]/.test(word)).length;
  return capitalized / significant.length >= threshold;
}

function isSectionHeading(line: string, prevWasBlank: boolean): boolean {
  const trimmed = line.trim();
  if (!prevWasBlank || !trimmed || trimmed.length > 55) return false;
  if (isNumberedListLine(line) || isBulletLine(line) || isUrlLine(line)) return false;
  if (/[.!?]$/.test(trimmed)) return false;
  if (trimmed.split(/\s+/).length > 6) return false;
  return isTitleCaseHeading(trimmed, 0.66);
}

function isSubHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 50) return false;
  if (isNumberedListLine(line) || isBulletLine(line) || isUrlLine(line)) return false;
  if (/[.!?]$/.test(trimmed)) return false;
  if (trimmed.endsWith(":")) return false;
  if (trimmed.split(/\s+/).length > 5) return false;
  return isTitleCaseHeading(trimmed, 0.75);
}

function isColonIntroLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.endsWith(":") || trimmed.length > 90) return false;
  if (isNumberedListLine(line) || isBulletLine(line) || isUrlLine(line)) return false;
  return true;
}

function isListLabelLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 70) return false;
  if (isNumberedListLine(line) || isBulletLine(line) || isUrlLine(line)) return false;
  if (isSectionHeading(line, true) || isSubHeading(line) || isColonIntroLine(line)) return false;
  return true;
}

function appendContinuation(target: string[], text: string): void {
  if (!target.length) {
    target.push(text);
    return;
  }
  target[target.length - 1] = `${target[target.length - 1]} ${text}`.trim();
}

/**
 * Converts pasted plain-text wiki content (headings, lists, paragraphs) into KB blocks.
 */
export function plainTextToKbBlocks(text: string): KbBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: KbBlock[] = [];
  let i = 0;
  let prevWasBlank = true;

  while (i < lines.length) {
    const rawLine = lines[i];

    if (isBlank(rawLine)) {
      prevWasBlank = true;
      i++;
      continue;
    }

    const trimmed = rawLine.trim();

    if (isUrlLine(trimmed)) {
      blocks.push({
        id: newBlockId(),
        type: "link",
        content: trimmed,
        text: trimmed,
      });
      prevWasBlank = false;
      i++;
      continue;
    }

    if (isNumberedListLine(rawLine)) {
      const items: string[] = [];
      while (i < lines.length && !isBlank(lines[i])) {
        const line = lines[i];
        if (isNumberedListLine(line)) {
          items.push(stripNumberedPrefix(line));
          i++;
          while (i < lines.length) {
            const next = lines[i];
            if (isBlank(next)) break;
            if (isNumberedListLine(next) || isBulletLine(next) || isUrlLine(next.trim())) {
              break;
            }
            if (isSectionHeading(next, true) || isSubHeading(next) || isColonIntroLine(next)) {
              break;
            }
            appendContinuation(items, next.trim());
            i++;
          }
        } else {
          break;
        }
      }
      if (items.length) {
        blocks.push({ id: newBlockId(), type: "numbered_list", items });
      }
      prevWasBlank = false;
      continue;
    }

    if (isBulletLine(rawLine)) {
      const items: string[] = [];
      while (i < lines.length && !isBlank(lines[i])) {
        const line = lines[i];
        if (isBulletLine(line)) {
          items.push(stripBulletPrefix(line));
          i++;
        } else if (
          isNumberedListLine(line) ||
          isSectionHeading(line, true) ||
          isSubHeading(line) ||
          isColonIntroLine(line) ||
          isUrlLine(line.trim())
        ) {
          break;
        } else {
          appendContinuation(items, line.trim());
          i++;
        }
      }
      if (items.length) {
        blocks.push({ id: newBlockId(), type: "bullet_list", items });
      }
      prevWasBlank = false;
      continue;
    }

    if (isColonIntroLine(rawLine)) {
      blocks.push({
        id: newBlockId(),
        type: "heading3",
        content: trimmed.replace(/:$/, "").trim(),
      });
      i++;

      const items: string[] = [];
      while (i < lines.length && isListLabelLine(lines[i])) {
        items.push(lines[i].trim());
        i++;
      }

      if (items.length >= 2) {
        blocks.push({ id: newBlockId(), type: "bullet_list", items });
      } else if (items.length === 1) {
        blocks.push({ id: newBlockId(), type: "paragraph", content: items[0] });
      }

      prevWasBlank = false;
      continue;
    }

    if (prevWasBlank && isSectionHeading(rawLine, prevWasBlank)) {
      blocks.push({ id: newBlockId(), type: "heading2", content: trimmed });
      prevWasBlank = false;
      i++;
      continue;
    }

    if (isSubHeading(rawLine)) {
      blocks.push({ id: newBlockId(), type: "heading3", content: trimmed });
      prevWasBlank = false;
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && !isBlank(lines[i])) {
      const line = lines[i];
      if (
        isNumberedListLine(line) ||
        isBulletLine(line) ||
        isUrlLine(line.trim()) ||
        isColonIntroLine(line) ||
        isSectionHeading(line, true) ||
        isSubHeading(line)
      ) {
        break;
      }
      paraLines.push(line.trim());
      i++;
    }

    if (paraLines.length) {
      blocks.push({
        id: newBlockId(),
        type: "paragraph",
        content: paraLines.join(" "),
      });
    }
    prevWasBlank = false;
  }

  return blocks;
}

export function shouldExpandPlainTextBlocks(blocks: KbBlock[]): boolean {
  if (blocks.length === 0) return false;

  if (blocks.length === 1 && blocks[0].type === "paragraph") {
    const content = blocks[0].content ?? "";
    return (
      content.includes("\n") &&
      (content.includes("\n\n") ||
        /^\d+\.\s/m.test(content) ||
        /^\t/m.test(content) ||
        /^[-*•]\s/m.test(content))
    );
  }

  if (blocks.every((block) => block.type === "paragraph")) {
    const combined = blocks.map((block) => block.content ?? "").join("\n");
    return combined.includes("\n\n") || /^\d+\.\s/m.test(combined) || /^\t/m.test(combined);
  }

  return false;
}

export function blocksToPlainTextForExpansion(blocks: KbBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "bullet_list":
        case "numbered_list":
          return (block.items ?? []).join("\n");
        case "divider":
          return "";
        default:
          return block.content ?? "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}
