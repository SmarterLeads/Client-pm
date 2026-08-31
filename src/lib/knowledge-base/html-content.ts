import type { KbBlock } from "@/lib/knowledge-base/types";

function newBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function blocksToHtml(blocks: KbBlock[]): string {
  const htmlBlock = blocks.find((block) => block.type === "html");
  if (htmlBlock?.content?.trim()) {
    return htmlBlock.content;
  }

  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "heading1":
        parts.push(`<h1>${escapeHtml(block.content ?? "")}</h1>`);
        break;
      case "heading2":
        parts.push(`<h2>${escapeHtml(block.content ?? "")}</h2>`);
        break;
      case "heading3":
        parts.push(`<h3>${escapeHtml(block.content ?? "")}</h3>`);
        break;
      case "bullet_list": {
        const items = (block.items ?? []).filter(Boolean);
        if (items.length) {
          parts.push(
            `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
          );
        }
        break;
      }
      case "numbered_list": {
        const items = (block.items ?? []).filter(Boolean);
        if (items.length) {
          parts.push(
            `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`,
          );
        }
        break;
      }
      case "code":
        parts.push(`<pre><code>${escapeHtml(block.content ?? "")}</code></pre>`);
        break;
      case "link":
        if (block.content?.trim()) {
          const label = block.text?.trim() || block.content;
          parts.push(
            `<p><a href="${escapeHtml(block.content)}">${escapeHtml(label)}</a></p>`,
          );
        }
        break;
      case "image":
        if (block.src?.trim()) {
          parts.push(
            `<figure><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt ?? "")}" />${block.alt?.trim() ? `<figcaption>${escapeHtml(block.alt)}</figcaption>` : ""}</figure>`,
          );
        }
        break;
      case "divider":
        parts.push("<hr />");
        break;
      case "paragraph":
      default:
        if (block.content?.trim()) {
          parts.push(`<p>${escapeHtml(block.content).replace(/\n/g, "<br />")}</p>`);
        }
    }
  }

  return parts.join("") || "<p></p>";
}

export function htmlToBlocks(html: string): KbBlock[] {
  const trimmed = html.trim();
  if (!trimmed || trimmed === "<p></p>") {
    return [{ id: newBlockId(), type: "html", content: "<p></p>" }];
  }

  return [{ id: newBlockId(), type: "html", content: trimmed }];
}

export function plainTextFromBlocks(blocks: KbBlock[]): string {
  const htmlBlock = blocks.find((block) => block.type === "html");
  if (htmlBlock?.content) {
    return stripHtml(htmlBlock.content);
  }

  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "bullet_list":
      case "numbered_list":
        parts.push(...(block.items ?? []).filter(Boolean));
        break;
      case "link":
        parts.push(block.text ?? "", block.content ?? "");
        break;
      case "image":
        parts.push(block.alt ?? "");
        break;
      default:
        parts.push(block.content ?? "");
    }
  }
  return parts.filter(Boolean).join("\n");
}
