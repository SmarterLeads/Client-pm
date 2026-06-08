import { AgencyCard } from "@/components/agencies/agency-card";
import { getAgenciesWithStats } from "@/lib/queries/agencies";

export default async function AgenciesPage() {
  const agencies = await getAgenciesWithStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agencies</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio overview across {agencies.length} agenc
          {agencies.length === 1 ? "y" : "ies"}. Select an agency to filter
          clients.
        </p>
      </div>

      {agencies.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          No agencies found.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agencies.map((agency) => (
            <AgencyCard key={agency.id} agency={agency} />
          ))}
        </div>
      )}
    </div>
  );
}
