import { redirect } from "next/navigation";
import { DashboardBillableHoursChart } from "@/components/dashboard/dashboard-billable-hours-chart";
import { DashboardClientHealthTable } from "@/components/dashboard/dashboard-client-health-table";
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards";
import { DashboardMyTasksWidget } from "@/components/dashboard/dashboard-my-tasks-widget";
import { DashboardTeamWorkloadPanel } from "@/components/dashboard/dashboard-team-workload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeamMember } from "@/lib/auth/session";
import {
  getDashboardBillableHoursByClient,
  getDashboardClientHealth,
  getDashboardKpis,
  getDashboardMyTasks,
  getDashboardTeamWorkload,
} from "@/lib/queries/dashboard";

export default async function DashboardPage() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    redirect("/login");
  }

  const [kpis, clients, teamWorkload, billableByClient, myTasks] =
    await Promise.all([
      getDashboardKpis(),
      getDashboardClientHealth(),
      getDashboardTeamWorkload(),
      getDashboardBillableHoursByClient(),
      getDashboardMyTasks(teamMember.id),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Client health, team capacity, and monthly billable hours at a glance.
        </p>
      </div>

      <DashboardKpiCards kpis={kpis} />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Client health</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardClientHealthTable clients={clients} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <DashboardTeamWorkloadPanel members={teamWorkload} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Billable hours by client this month</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardBillableHoursChart data={billableByClient} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <DashboardMyTasksWidget tasks={myTasks} />
        </div>
      </div>
    </div>
  );
}
