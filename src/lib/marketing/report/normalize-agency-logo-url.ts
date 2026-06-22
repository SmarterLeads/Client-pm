/**
 * Cleans `agencies.logo_url` for embedding in `<img>` and PDFs.
 * Wrong types, whitespace-only, or unsupported schemes yield null so callers can show placeholders.
 */

function encodePublicPathSegments(pathname: string): string {
  const parts = pathname.split("/");
  return parts
    .map((segment) => {
      if (segment === "") return "";
      try {
        return encodeURIComponent(decodeURIComponent(segment.replace(/\+/g, "%20")));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
}

/**
 * Supabase public object URLs paste from the dashboard encoded, but spreadsheets / copy-paste
 * sometimes leave literal spaces in the bucket or object portion — that yields 400/HTML errors when loaded.
 */
function canonSupabasePublicObjectUrl(parsed: URL): void {
  if (!parsed.hostname.endsWith(".supabase.co")) return;
  if (!parsed.pathname.includes("/storage/v1/object/public/")) return;
  parsed.pathname = encodePublicPathSegments(parsed.pathname);
}

export function normalizeAgencyLogoUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return null;
  const lower = t.toLowerCase();
  if (!(lower.startsWith("https://") || lower.startsWith("http://"))) return null;
  let out: URL;
  try {
    out = new URL(t);
    canonSupabasePublicObjectUrl(out);
  } catch {
    return null;
  }
  return out.toString();
}
