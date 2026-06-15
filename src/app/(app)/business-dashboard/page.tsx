import { redirect } from "next/navigation";
import { BusinessDashboardAgencyCards } from "@/components/business-dashboard/business-dashboard-agency-cards";
import { BusinessDashboardFinancialsTable } from "@/components/business-dashboard/business-dashboard-financials-table";
import { BusinessDashboardHourlyBillingTable } from "@/components/business-dashboard/business-dashboard-hourly-billing-table";
import { BusinessDashboardKpiCards } from "@/components/business-dashboard/business-dashboard-kpi-cards";
import { BusinessDashboardMonthlyTable } from "@/components/business-dashboard/business-dashboard-monthly-table";
import { BusinessDashboardSectionError } from "@/components/business-dashboard/business-dashboard-section-error";
import { ServicesOverviewCards } from "@/components/business-dashboard/business-dashboard-service-cards";
import {
  canViewBusinessDashboard,
  canViewMonthlyFinancials,
} from "@/lib/auth/business-dashboard";
import { mergeServiceOverviewRows } from "@/lib/business-dashboard/service-overview";
import { getTeamMember } from "@/lib/auth/session";
import {
  getActiveClientsByService,
  getBusinessDashboardKpis,
  getHourlyBillingThisMonth,
  getMonthlyBusinessResults,
  getMonthlyFinancials,
  getMrrByAgency,
  getMrrByService,
} from "@/lib/queries/business-dashboard";

async function fetchDashboardSection<T>(
  label: string,
  query: () => Promise<T>,
): Promise<T | null> {
  return query().catch((error) => {
    console.error(`[BusinessDashboard] ${label} error:`, error);
    return null;
  });
}

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

  const kpis = await fetchDashboardSection("kpis", getBusinessDashboardKpis);
  const hourlyBilling = canViewMonthlyResults
    ? await fetchDashboardSection(
        "hourlyBilling",
        getHourlyBillingThisMonth,
      )
    : null;
  const mrrByAgency = await fetchDashboardSection(
    "mrrByAgency",
    getMrrByAgency,
  );
  const clientsByService = await fetchDashboardSection(
    "clientsByService",
    getActiveClientsByService,
  );
  const mrrByService = await fetchDashboardSection(
    "mrrByService",
    getMrrByService,
  );
  const monthlyResults = canViewMonthlyResults
    ? await fetchDashboardSection(
        "monthlyResults",
        getMonthlyBusinessResults,
      )
    : null;
  const monthlyFinancials = showFinancials
    ? await fetchDashboardSection("monthlyFinancials", () =>
        getMonthlyFinancials(currentYear),
      )
    : null;

  const servicesOverview = mergeServiceOverviewRows(
    clientsByService ?? [],
    mrrByService ?? [],
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

      {kpis ? (
        <BusinessDashboardKpiCards kpis={kpis} />
      ) : (
        <BusinessDashboardSectionError section="KPI summary" />
      )}

      {mrrByAgency ? (
        <BusinessDashboardAgencyCards agencies={mrrByAgency} />
      ) : (
        <BusinessDashboardSectionError section="agency MRR cards" />
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Services Overview
        </h2>
        {clientsByService || mrrByService ? (
          <ServicesOverviewCards data={servicesOverview} />
        ) : (
          <BusinessDashboardSectionError section="services overview" />
        )}
      </section>

      {canViewMonthlyResults ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Hourly Billing This Month
          </h2>
          {hourlyBilling ? (
            <BusinessDashboardHourlyBillingTable rows={hourlyBilling} />
          ) : (
            <BusinessDashboardSectionError section="hourly billing" />
          )}
        </section>
      ) : null}

      {canViewMonthlyResults ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Monthly Results
          </h2>
          {monthlyResults ? (
            <BusinessDashboardMonthlyTable rows={monthlyResults} />
          ) : (
            <BusinessDashboardSectionError section="monthly results" />
          )}
        </section>
      ) : null}

      {showFinancials ? (
        monthlyFinancials ? (
          <BusinessDashboardFinancialsTable
            initialYear={currentYear}
            initialRows={monthlyFinancials}
          />
        ) : (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Monthly Financials
            </h2>
            <BusinessDashboardSectionError section="monthly financials" />
          </section>
        )
      ) : null}
    </div>
  );
}
