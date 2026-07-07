import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { QuickCreateProvider } from "@/components/app/quick-create-provider";
import { TaskDrawerProvider } from "@/components/tasks/task-drawer-provider";
import { isBlockedPmEmail } from "@/lib/auth/blocked-emails";
import {
  getPublicClientUser,
  getSessionUser,
  getTeamMember,
  getUnreadNotificationCount,
} from "@/lib/auth/session";
import { getMarketingReportClientGroups } from "@/lib/queries/marketing";
import { getPendingEmailLogCount } from "@/lib/queries/email-log";
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

  if (isBlockedPmEmail(user.email)) {
    redirect("/auth/access-denied");
  }

  const publicClientUser = await getPublicClientUser(user.id);
  if (publicClientUser) {
    redirect("/auth/access-denied");
  }

  const teamMember = await getTeamMember();
  if (!teamMember) {
    if (user.email && isBlockedPmEmail(user.email)) {
      redirect("/auth/access-denied");
    }
    redirect("/login");
  }

  const [unreadCount, notifications, pendingEmailCount, teamMembers, reportClientGroups] =
    await Promise.all([
      getUnreadNotificationCount(teamMember.id),
      getNotificationsForRecipient(teamMember.id),
      getPendingEmailLogCount(),
      getTeamMembersForSelect(),
      getMarketingReportClientGroups().catch(() => []),
    ]);

  return (
    <QuickCreateProvider teamMember={teamMember}>
      <AppShell
        teamMember={teamMember}
        unreadCount={unreadCount}
        pendingEmailCount={pendingEmailCount}
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
