import { Suspense } from "react";
import { ContactsFilters } from "@/components/contacts/contacts-filters";
import { ContactsList } from "@/components/contacts/contacts-list";
import { Skeleton } from "@/components/ui/skeleton";
import { getAgenciesList } from "@/lib/queries/agencies";
import { getContacts } from "@/lib/queries/contacts";
import { getClientsForSelect } from "@/lib/queries/projects";
import { contactListFiltersSchema, parseContactListFilters } from "@/lib/validations/contact";

type ContactsPageProps = {
  searchParams: Promise<{
    q?: string;
    agency?: string;
    client?: string;
    primary?: string;
  }>;
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const parsed = contactListFiltersSchema.safeParse({
    q: params.q,
    agency: params.agency || undefined,
    client: params.client || undefined,
    primary: params.primary || undefined,
  });

  const filters = parsed.success
    ? parseContactListFilters(parsed.data)
    : {};
  const [contactsPage, agencies, clients] = await Promise.all([
    getContacts(filters),
    getAgenciesList(),
    getClientsForSelect(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <p className="text-sm text-muted-foreground">
          {contactsPage.totalCount} contact
          {contactsPage.totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <ContactsFilters agencies={agencies} clients={clients} />
      </Suspense>

      <ContactsList
        key={JSON.stringify(filters)}
        initialContacts={contactsPage.contacts}
        initialNextCursor={contactsPage.nextCursor}
        filters={filters}
        clients={clients}
      />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Skeleton className="h-8 w-full sm:max-w-xs" />
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-8 w-36" />
    </div>
  );
}
