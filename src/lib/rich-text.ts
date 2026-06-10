import DOMPurify from "isomorphic-dompurify";

const EMPTY_HTML = /^(<p><\/p>|<p><br><\/p>|<p><br\/><\/p>|\s*)$/i;

export function isRichTextHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value.trim());
}

export function normalizeRichTextHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed || EMPTY_HTML.test(trimmed)) {
    return "";
  }
  return trimmed;
}

export function sanitizeRichTextHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "hr",
    ],
    ALLOWED_ATTR: [],
  });
}
