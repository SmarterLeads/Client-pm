"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClientReportsNav } from "@/components/app/client-reports-nav";
import {
  adminNavItems,
  clientNavItems,
  deliveryNavItems,
  getWorkspaceNavItems,
  type AppNavItem,
} from "@/components/app/nav-config";
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

function NavLink({ item, pathname }: { item: AppNavItem; pathname: string }) {
  const active = isActive(pathname, item.href, item.matchPrefix);
  const Icon = item.icon;

  return (
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
  );
}

type AppSidebarProps = {
  isAdmin?: boolean;
  canViewBusinessDashboard?: boolean;
  reportClientGroups?: AgencyReportClientGroup[];
};

export function AppSidebar({
  isAdmin = false,
  canViewBusinessDashboard = false,
  reportClientGroups = [],
}: AppSidebarProps) {
  const pathname = usePathname() ?? "";

  const sections = [
    {
      items: getWorkspaceNavItems(canViewBusinessDashboard),
      showDividerBefore: false,
    },
    { items: clientNavItems, showDividerBefore: false },
    { items: deliveryNavItems, showDividerBefore: false },
    ...(isAdmin
      ? [{ items: adminNavItems, showDividerBefore: true }]
      : []),
  ];

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
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {sections.map((section, index) => (
          <div key={index} className="contents">
            {section.showDividerBefore ? (
              <div
                className="my-2 hidden border-t border-sidebar-border/60 lg:block"
                aria-hidden
              />
            ) : null}
            {section.items.map((item) => {
              if (
                item.href === "/marketing" &&
                item.label === "Marketing Overview"
              ) {
                const active = isActive(pathname, item.href, item.matchPrefix);
                const Icon = item.icon;
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
                      <span className="hidden truncate lg:inline">
                        {item.label}
                      </span>
                    </Link>
                    <ClientReportsNav groups={reportClientGroups} />
                  </div>
                );
              }

              return (
                <NavLink key={item.href} item={item} pathname={pathname} />
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
