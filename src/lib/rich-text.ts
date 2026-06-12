const EMPTY_HTML = /^(<p><\/p>|<p><br><\/p>|<p><br\/><\/p>|\s*)$/i;

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isRichTextHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value.trim());
}

export function prepareRichTextForEditor(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (isRichTextHtml(trimmed)) return trimmed;

  return trimmed
    .split(/\n\s*\n/)
    .map((paragraph) => {
      const lines = paragraph.split("\n").map(escapeHtml).join("<br>");
      return `<p>${lines}</p>`;
    })
    .join("");
}

export function normalizeRichTextHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed || EMPTY_HTML.test(trimmed)) {
    return "";
  }
  return trimmed;
}
