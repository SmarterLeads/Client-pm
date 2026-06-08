"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClientReportsNav } from "@/components/app/client-reports-nav";
import { adminNavItems, appNavItems } from "@/components/app/nav-config";
import type { AgencyReportClientGroup } from "@/lib/marketing/types";

function isActive(pathname: string, href: string, matchPrefix?: boolean) {
  if (href === "/marketing") {
    return pathname === "/marketing";
  }
  if (matchPrefix) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href;
}

type AppSidebarProps = {
  isAdmin?: boolean;
  reportClientGroups?: AgencyReportClientGroup[];
};

export function AppSidebar({
  isAdmin = false,
  reportClientGroups = [],
}: AppSidebarProps) {
  const pathname = usePathname();
  const navItems = [...appNavItems, ...(isAdmin ? adminNavItems : [])];

  return (
    <aside className="flex h-full w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:w-56">
      <div className="flex h-14 items-center justify-center border-b border-sidebar-border px-2 lg:justify-start lg:px-4">
        <Link
          href="/dashboard"
          className="font-semibold tracking-tight text-sidebar-foreground"
        >
          <span className="lg:hidden">SL</span>
          <span className="hidden lg:inline">Smarter Leads</span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href, item.matchPrefix);
          const Icon = item.icon;
          const showClientReports =
            item.href === "/marketing" && item.label === "Marketing Overview";

          return (
            <div key={item.href} className="contents">
              <Link
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="hidden truncate lg:inline">{item.label}</span>
              </Link>
              {showClientReports ? (
                <ClientReportsNav groups={reportClientGroups} />
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
