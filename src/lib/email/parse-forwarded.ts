import { extractEmailAddresses } from "@/lib/email/parse-address";

const FORWARDED_MESSAGE_MARKER =
  /-{5,}\s*forwarded message\s*-{5,}/i;

const FORWARDED_HEADER_LINE =
  /^(from|to|cc|bcc|reply-to|sent|date|subject)\s*:\s*(.+)$/i;

type ForwardHeaderKind = "to" | "cc" | "bcc" | "from" | "other";

function bucketForHeaderLine(line: string): ForwardHeaderKind | null {
  const match = line.trim().match(FORWARDED_HEADER_LINE);
  if (!match?.[1]) return null;

  switch (match[1].toLowerCase()) {
    case "to":
      return "to";
    case "cc":
      return "cc";
    case "bcc":
      return "bcc";
    case "from":
      return "from";
    default:
      return "other";
  }
}

function extractEmailsFromHeaderLine(line: string): string[] {
  const match = line.trim().match(FORWARDED_HEADER_LINE);
  if (!match?.[2]) return [];
  return extractEmailAddresses(match[2]);
}

function collectForwardedEmails(lines: string[]): string[] {
  const buckets: Record<ForwardHeaderKind, string[]> = {
    to: [],
    cc: [],
    bcc: [],
    from: [],
    other: [],
  };

  for (const line of lines) {
    const kind = bucketForHeaderLine(line);
    if (!kind) continue;

    for (const email of extractEmailsFromHeaderLine(line)) {
      if (!buckets[kind].includes(email)) {
        buckets[kind].push(email);
      }
    }
  }

  return [
    ...buckets.to,
    ...buckets.cc,
    ...buckets.bcc,
    ...buckets.from,
    ...buckets.other,
  ];
}

/** True when the subject looks like a forwarded email. */
export function isForwardedSubject(subject: string | null | undefined): boolean {
  if (!subject?.trim()) return false;
  return /^(fwd?|fw)\s*:/i.test(subject.trim());
}

/** Strip Fwd:/FW: prefix from a forwarded subject. */
export function stripForwardedSubjectPrefix(
  subject: string | null | undefined,
): string | null {
  if (!subject?.trim()) return null;
  const stripped = subject.trim().replace(/^(fwd?|fw)\s*:\s*/i, "").trim();
  return stripped || subject.trim();
}

/**
 * Pull likely original-recipient addresses out of a forwarded email body.
 * Handles Gmail/Outlook-style "---------- Forwarded message ---------" blocks.
 * Returns emails in priority order: To, Cc, Bcc, From.
 */
export function extractEmailsFromForwardedBody(
  body: string | null | undefined,
): string[] {
  if (!body?.trim()) return [];

  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const markerIndex = lines.findIndex((line) =>
    FORWARDED_MESSAGE_MARKER.test(line.trim()),
  );

  const prioritized = collectForwardedEmails(lines);

  if (markerIndex >= 0) {
    const headerBlock = lines.slice(markerIndex + 1, markerIndex + 20);
    const blockEmails = collectForwardedEmails(headerBlock);
    const seen = new Set(prioritized);

    for (const email of blockEmails) {
      if (!seen.has(email)) {
        seen.add(email);
        prioritized.push(email);
      }
    }
  }

  return prioritized;
}

export function htmlToPlainText(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;

  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text || null;
}
