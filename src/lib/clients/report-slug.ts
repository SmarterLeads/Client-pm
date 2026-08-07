/** URL-safe slug from client name, e.g. "Brafit IQ" → "brafit-iq". */
export function slugifyClientName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (s.length > 0 ? s : "client").slice(0, 100);
}
