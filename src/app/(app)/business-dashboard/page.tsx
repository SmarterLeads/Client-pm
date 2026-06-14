import { redirect } from "next/navigation";
import { BusinessDashboardAgencyCards } from "@/components/business-dashboard/business-dashboard-agency-cards";
import { BusinessDashboardKpiCards } from "@/components/business-dashboard/business-dashboard-kpi-cards";
import {
  ActiveClientsByServiceCards,
  MrrByServiceCards,
} from "@/components/business-dashboard/business-dashboard-service-cards";
import { canViewBusinessDashboard } from "@/lib/auth/business-dashboard";
import { getTeamMember } from "@/lib/auth/session";
import {
  getActiveClientsByService,
  getBusinessDashboardKpis,
  getMrrByAgency,
  getMrrByService,
} from "@/lib/queries/business-dashboard";

export default async function BusinessDashboardPage() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    redirect("/login");
  }

  if (!canViewBusinessDashboard(teamMember)) {
    redirect("/dashboard");
  }

  const [kpis, mrrByAgency, clientsByService, mrrByService] =
    await Promise.all([
      getBusinessDashboardKpis(),
      getMrrByAgency(),
      getActiveClientsByService(),
      getMrrByService(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Business Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Client count, MRR, and service mix across active accounts.
        </p>
      </div>

      <BusinessDashboardKpiCards kpis={kpis} />

      <BusinessDashboardAgencyCards agencies={mrrByAgency} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Active Clients by Service
        </h2>
        <ActiveClientsByServiceCards data={clientsByService} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">MRR by Service</h2>
        <MrrByServiceCards data={mrrByService} />
      </section>
    </div>
  );
}
