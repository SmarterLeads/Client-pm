export function normalizeEmail(value: string): string {
  return parseEmailAddress(value).trim().toLowerCase();
}

export function parseEmailAddress(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^>]+)>/);
  return (match?.[1] ?? trimmed).trim();
}

export function extractEmailAddresses(
  values: string | string[] | null | undefined,
): string[] {
  if (!values) return [];

  const list = Array.isArray(values) ? values : [values];
  const emails = new Set<string>();

  for (const value of list) {
    if (!value?.trim()) continue;
    for (const part of value.split(",")) {
      const email = normalizeEmail(part);
      if (email.includes("@")) emails.add(email);
    }
  }

  return [...emails];
}
