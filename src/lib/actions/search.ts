"use server";

import { getTeamMember } from "@/lib/auth/session";
import {
  globalSearch,
  type GlobalSearchResults,
} from "@/lib/queries/search";

export async function searchGlobal(query: string): Promise<GlobalSearchResults> {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    throw new Error("You must be signed in to search.");
  }

  return globalSearch(query);
}
