import { redirect } from "next/navigation";
import {
  ActiveClientsByServiceChart,
  MrrByServiceChart,
} from "@/components/business-dashboard/business-dashboard-charts";
import { BusinessDashboardAgencyCards } from "@/components/business-dashboard/business-dashboard-agency-cards";
import { BusinessDashboardKpiCards } from "@/components/business-dashboard/business-dashboard-kpi-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <Card>
        <CardHeader>
          <CardTitle>Active clients by service</CardTitle>
        </CardHeader>
        <CardContent>
          <ActiveClientsByServiceChart data={clientsByService} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>MRR by service</CardTitle>
        </CardHeader>
        <CardContent>
          <MrrByServiceChart data={mrrByService} />
        </CardContent>
      </Card>
    </div>
  );
}
