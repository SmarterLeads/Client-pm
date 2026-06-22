import { AppSidebar } from "@/components/app/app-sidebar";
import { AppTopBar } from "@/components/app/app-top-bar";
import { isAdmin } from "@/lib/auth/roles";
import { canViewBusinessDashboard } from "@/lib/auth/business-dashboard";
import type { AgencyReportClientGroup } from "@/lib/marketing/types";
import type { Notification, TeamMember } from "@/lib/types";

type AppShellProps = {
  teamMember: TeamMember;
  unreadCount: number;
  pendingEmailCount: number;
  notifications: Notification[];
  reportClientGroups: AgencyReportClientGroup[];
  children: React.ReactNode;
};

/** Presentational shell — auth is handled in (app)/layout.tsx */
export function AppShell({
  teamMember,
  unreadCount,
  pendingEmailCount,
  notifications,
  reportClientGroups,
  children,
}: AppShellProps) {
  const admin = isAdmin(teamMember.role);
  const showBusinessDashboard = canViewBusinessDashboard(teamMember);

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <div className="hidden lg:flex">
        <AppSidebar
          isAdmin={admin}
          canViewBusinessDashboard={showBusinessDashboard}
          reportClientGroups={reportClientGroups}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar
          teamMember={teamMember}
          unreadCount={unreadCount}
          pendingEmailCount={pendingEmailCount}
          notifications={notifications}
          reportClientGroups={reportClientGroups}
          canViewBusinessDashboard={showBusinessDashboard}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
