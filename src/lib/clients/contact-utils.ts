export function formatContactName(contact: {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}) {
  if (contact.name?.trim()) return contact.name.trim();

  const parts = [contact.first_name, contact.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");

  return contact.email ?? "—";
}
