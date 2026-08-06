/** URL-safe slug from client name, e.g. "Brafit IQ" → "brafit-iq". */
export function slugifyClientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
