import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { QuickCreateProvider } from "@/components/app/quick-create-provider";
import { TaskDrawerProvider } from "@/components/tasks/task-drawer-provider";
import {
  getSessionUser,
  getTeamMember,
  getUnreadNotificationCount,
} from "@/lib/auth/session";
import { getMarketingReportClientGroups } from "@/lib/queries/marketing";
import { getNotificationsForRecipient } from "@/lib/queries/notifications";
import { getTeamMembersForSelect } from "@/lib/queries/projects";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const teamMember = await getTeamMember();
  if (!teamMember) {
    redirect("/login");
  }

  const [unreadCount, notifications, teamMembers, reportClientGroups] =
    await Promise.all([
      getUnreadNotificationCount(teamMember.id),
      getNotificationsForRecipient(teamMember.id),
      getTeamMembersForSelect(),
      getMarketingReportClientGroups().catch(() => []),
    ]);

  return (
    <QuickCreateProvider teamMember={teamMember}>
      <AppShell
        teamMember={teamMember}
        unreadCount={unreadCount}
        notifications={notifications}
        reportClientGroups={reportClientGroups}
      >
        <TaskDrawerProvider teamMembers={teamMembers}>
          {children}
        </TaskDrawerProvider>
      </AppShell>
    </QuickCreateProvider>
  );
}
