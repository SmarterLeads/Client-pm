"use server";

import { getTeamMember } from "@/lib/auth/session";
import {
  getContacts,
  type ContactsListPage,
} from "@/lib/queries/contacts";
import type { ContactListFilters } from "@/lib/validations/contact";

export async function loadMoreContacts(
  filters: ContactListFilters,
  cursor: string,
): Promise<ContactsListPage> {
  await getTeamMember();
  return getContacts(filters, { cursor });
}
