import { formatContactName } from "@/lib/clients/contact-utils";
import { createClient } from "@/lib/supabase/server";
import type { ContactListFilters } from "@/lib/validations/contact";

export type ContactListRow = {
  id: string;
  client_id: string;
  client_name: string;
  agency_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  job_title: string | null;
  preferred_contact_method: string | null;
  is_primary: boolean;
};

export type ContactsListPage = {
  contacts: ContactListRow[];
  nextCursor: string | null;
  totalCount: number;
};

export const CONTACTS_PAGE_SIZE = 50;

type ContactsCursor = {
  first_name: string;
  last_name: string;
  id: string;
};

function encodeContactsCursor(
  first_name: string | null,
  last_name: string | null,
  id: string,
): string {
  return Buffer.from(
    JSON.stringify({
      first_name: first_name ?? "",
      last_name: last_name ?? "",
      id,
    } satisfies ContactsCursor),
  ).toString("base64url");
}

function decodeContactsCursor(cursor: string): ContactsCursor {
  const parsed = JSON.parse(
    Buffer.from(cursor, "base64url").toString("utf8"),
  ) as ContactsCursor;
  if (!parsed?.id) {
    throw new Error("Invalid pagination cursor.");
  }
  return {
    first_name: parsed.first_name ?? "",
    last_name: parsed.last_name ?? "",
    id: parsed.id,
  };
}

function escapePostgrestValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

type ContactQueryRow = {
  id: string;
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  job_title: string | null;
  preferred_contact_method: string | null;
  is_primary: boolean;
  clients: {
    id: string;
    name: string;
    agency_id: string;
    agencies: { name: string } | null;
  } | null;
};

function mapContactRow(row: ContactQueryRow): ContactListRow {
  return {
    id: row.id,
    client_id: row.client_id,
    client_name: row.clients?.name ?? "—",
    agency_name: row.clients?.agencies?.name ?? null,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    job_title: row.job_title,
    preferred_contact_method: row.preferred_contact_method,
    is_primary: row.is_primary,
  };
}

async function resolveSearchContactIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase.rpc("filter_client_contact_ids_by_search", {
    p_query: trimmed,
  });

  if (error) {
    console.error("[getContacts search]", error.message);
    return [];
  }

  return (data ?? []) as string[];
}

async function applyContactFilters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: ContactListFilters,
) {
  let searchIds: string[] | null = null;
  if (filters.q?.trim()) {
    searchIds = await resolveSearchContactIds(supabase, filters.q);
    if (searchIds.length === 0) {
      return { empty: true as const, searchIds };
    }
  }

  let agencyClientIds: string[] | null = null;
  if (filters.agency) {
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id")
      .eq("agency_id", filters.agency);

    if (error) throw new Error(error.message);
    agencyClientIds = (clients ?? []).map((c) => c.id);
    if (agencyClientIds.length === 0) {
      return { empty: true as const, searchIds };
    }
  }

  return { empty: false as const, searchIds, agencyClientIds };
}

function buildContactsQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: ContactListFilters,
  searchIds: string[] | null,
  agencyClientIds: string[] | null,
  limit: number,
  cursor?: ContactsCursor,
) {
  let query = supabase
    .from("client_contacts")
    .select(
      `
      id,
      client_id,
      first_name,
      last_name,
      email,
      phone,
      job_title,
      preferred_contact_method,
      is_primary,
      clients!inner (
        id,
        name,
        agency_id,
        agencies ( name )
      )
    `,
    )
    .eq("is_active", true)
    .order("first_name", { ascending: true, nullsFirst: false })
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (searchIds) {
    query = query.in("id", searchIds);
  }

  if (agencyClientIds) {
    query = query.in("client_id", agencyClientIds);
  }

  if (filters.client) {
    query = query.eq("client_id", filters.client);
  }

  if (filters.primary === true) {
    query = query.eq("is_primary", true);
  }

  if (cursor) {
    const fn = escapePostgrestValue(cursor.first_name);
    const ln = escapePostgrestValue(cursor.last_name);
    const id = escapePostgrestValue(cursor.id);
    query = query.or(
      `first_name.gt."${fn}",and(first_name.eq."${fn}",last_name.gt."${ln}"),and(first_name.eq."${fn}",last_name.eq."${ln}",id.gt."${id}")`,
    );
  }

  return query;
}

async function countContacts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: ContactListFilters,
  searchIds: string[] | null,
  agencyClientIds: string[] | null,
): Promise<number> {
  let query = supabase
    .from("client_contacts")
    .select("id, clients!inner(id)", { count: "exact", head: true })
    .eq("is_active", true);

  if (searchIds) {
    query = query.in("id", searchIds);
  }

  if (agencyClientIds) {
    query = query.in("client_id", agencyClientIds);
  }

  if (filters.client) {
    query = query.eq("client_id", filters.client);
  }

  if (filters.primary === true) {
    query = query.eq("is_primary", true);
  }

  const { count, error } = await query;
  if (error) {
    console.error("[countContacts]", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function getContacts(
  filters: ContactListFilters = {},
  options: { cursor?: string | null; limit?: number } = {},
): Promise<ContactsListPage> {
  const supabase = await createClient();
  const limit = options.limit ?? CONTACTS_PAGE_SIZE;

  const filterState = await applyContactFilters(supabase, filters);
  if (filterState.empty) {
    return { contacts: [], nextCursor: null, totalCount: 0 };
  }

  const cursor = options.cursor ? decodeContactsCursor(options.cursor) : undefined;

  const [totalCount, listResult] = await Promise.all([
    countContacts(
      supabase,
      filters,
      filterState.searchIds,
      filterState.agencyClientIds,
    ),
    buildContactsQuery(
      supabase,
      filters,
      filterState.searchIds,
      filterState.agencyClientIds,
      limit,
      cursor,
    ),
  ]);

  const { data, error } = await listResult;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ContactQueryRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const contacts = pageRows.map(mapContactRow);

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeContactsCursor(last.first_name, last.last_name, last.id)
      : null;

  return { contacts, nextCursor, totalCount };
}

export { formatContactName };
