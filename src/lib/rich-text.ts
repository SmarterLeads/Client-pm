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
