import { redirect } from "next/navigation";
import { BusinessDashboardFinancialsTable } from "@/components/business-dashboard/business-dashboard-financials-table";
import { BusinessDashboardAgencyCards } from "@/components/business-dashboard/business-dashboard-agency-cards";
import { BusinessDashboardKpiCards } from "@/components/business-dashboard/business-dashboard-kpi-cards";
import { BusinessDashboardMonthlyTable } from "@/components/business-dashboard/business-dashboard-monthly-table";
import { ServicesOverviewCards } from "@/components/business-dashboard/business-dashboard-service-cards";
import { canViewBusinessDashboard, canViewMonthlyFinancials } from "@/lib/auth/business-dashboard";
import { mergeServiceOverviewRows } from "@/lib/business-dashboard/service-overview";
import { getTeamMember } from "@/lib/auth/session";
import {
  getActiveClientsByService,
  getBusinessDashboardKpis,
  getMonthlyBusinessResults,
  getMonthlyFinancials,
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

  const canViewMonthlyResults = teamMember.can_view_mrr;
  const showFinancials = canViewMonthlyFinancials(teamMember);
  const currentYear = new Date().getFullYear();

  const [kpis, mrrByAgency, clientsByService, mrrByService, monthlyResults, monthlyFinancials] =
    await Promise.all([
      getBusinessDashboardKpis(),
      getMrrByAgency(),
      getActiveClientsByService(),
      getMrrByService(),
      canViewMonthlyResults
        ? getMonthlyBusinessResults()
        : Promise.resolve(null),
      showFinancials
        ? getMonthlyFinancials(currentYear)
        : Promise.resolve(null),
    ]);

  const servicesOverview = mergeServiceOverviewRows(
    clientsByService,
    mrrByService,
  );

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
          Services Overview
        </h2>
        <ServicesOverviewCards data={servicesOverview} />
      </section>

      {canViewMonthlyResults && monthlyResults ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Monthly Results
          </h2>
          <BusinessDashboardMonthlyTable rows={monthlyResults} />
        </section>
      ) : null}

      {showFinancials && monthlyFinancials ? (
        <BusinessDashboardFinancialsTable
          initialYear={currentYear}
          initialRows={monthlyFinancials}
        />
      ) : null}
    </div>
  );
}
