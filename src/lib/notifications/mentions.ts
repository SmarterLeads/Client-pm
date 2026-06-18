type MentionCandidate = {
  id: string;
  name: string;
  email: string;
};

export function stripHtmlForMentions(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractMentionNames(body: string): string[] {
  const text = stripHtmlForMentions(body);
  const names = new Set<string>();

  for (const match of text.matchAll(/@([A-Za-z0-9][A-Za-z0-9\s.'-]{0,60})/g)) {
    const name = match[1]?.trim();
    if (name) names.add(name);
  }

  return [...names];
}

export function resolveMentionedTeamMemberIds(
  body: string,
  teamMembers: MentionCandidate[],
): string[] {
  const mentionNames = extractMentionNames(body);
  if (mentionNames.length === 0) return [];

  const ids = new Set<string>();

  for (const mention of mentionNames) {
    const normalized = mention.toLowerCase();
    const exact = teamMembers.find(
      (member) => member.name.toLowerCase() === normalized,
    );
    if (exact) {
      ids.add(exact.id);
      continue;
    }

    const partial = teamMembers.find((member) =>
      member.name.toLowerCase().startsWith(normalized),
    );
    if (partial) ids.add(partial.id);
  }

  return [...ids];
}
