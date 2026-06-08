import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/app/app-sidebar";
import { isAdmin } from "@/lib/auth/roles";
import { GlobalSearch } from "@/components/app/global-search";
import { QuickCreateButton } from "@/components/app/quick-create-button";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { AgencyReportClientGroup } from "@/lib/marketing/types";
import type { Notification, TeamMember } from "@/lib/types";

type AppTopBarProps = {
  teamMember: TeamMember;
  unreadCount: number;
  notifications: Notification[];
  reportClientGroups: AgencyReportClientGroup[];
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppTopBar({
  teamMember,
  unreadCount,
  notifications,
  reportClientGroups,
}: AppTopBarProps) {
  const admin = isAdmin(teamMember.role);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 lg:px-6">
      <Sheet>
        <SheetTrigger
          className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <AppSidebar isAdmin={admin} reportClientGroups={reportClientGroups} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 justify-center px-2">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <QuickCreateButton />
        <NotificationsBell
          unreadCount={unreadCount}
          notifications={notifications}
        />
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            {teamMember.avatar_url ? (
              <AvatarImage src={teamMember.avatar_url} alt={teamMember.name} />
            ) : null}
            <AvatarFallback className="text-xs">
              {initials(teamMember.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">
            {teamMember.name}
          </span>
        </div>
      </div>
    </header>
  );
}
