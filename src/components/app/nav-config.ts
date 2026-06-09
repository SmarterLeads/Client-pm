import {
  BarChart3,
  Building2,
  CheckSquare,
  FolderKanban,
  History,
  Landmark,
  LayoutDashboard,
  ScrollText,
  Settings,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match nested routes (e.g. /clients/[id]) */
  matchPrefix?: boolean;
};

export const pmDashboardNavItem: AppNavItem = {
  href: "/dashboard",
  label: "PM Dashboard",
  icon: LayoutDashboard,
};

export const businessDashboardNavItem: AppNavItem = {
  href: "/business-dashboard",
  label: "Business Dashboard",
  icon: BarChart3,
  matchPrefix: true,
};

export function getWorkspaceNavItems(
  canViewBusinessDashboard: boolean,
): AppNavItem[] {
  return [
    pmDashboardNavItem,
    ...(canViewBusinessDashboard ? [businessDashboardNavItem] : []),
    {
      href: "/marketing",
      label: "Marketing Overview",
      icon: TrendingUp,
      matchPrefix: true,
    },
    {
      href: "/agencies",
      label: "Agencies",
      icon: Landmark,
      matchPrefix: true,
    },
  ];
}

export const clientNavItems: AppNavItem[] = [
  {
    href: "/clients",
    label: "Clients",
    icon: Building2,
    matchPrefix: true,
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: Users,
    matchPrefix: true,
  },
];

export const deliveryNavItems: AppNavItem[] = [
  {
    href: "/projects",
    label: "Projects",
    icon: FolderKanban,
    matchPrefix: true,
  },
  { href: "/tasks", label: "My Tasks", icon: CheckSquare, matchPrefix: true },
  {
    href: "/interactions",
    label: "Interactions",
    icon: ScrollText,
    matchPrefix: true,
  },
  {
    href: "/internal/projects",
    label: "Internal Projects",
    icon: Building2,
    matchPrefix: true,
  },
  {
    href: "/internal/meetings",
    label: "Team Meetings",
    icon: Users,
    matchPrefix: true,
  },
  { href: "/team", label: "Team", icon: Users, matchPrefix: true },
  { href: "/settings", label: "Settings", icon: Settings, matchPrefix: true },
];

/** @deprecated Use getWorkspaceNavItems() for workspace section */
export const workspaceNavItems: AppNavItem[] = getWorkspaceNavItems(false);

export const appNavItems: AppNavItem[] = [
  ...workspaceNavItems,
  ...clientNavItems,
  ...deliveryNavItems,
];

/** Shown after Settings — admin only (see AppSidebar). */
export const adminNavItems: AppNavItem[] = [
  { href: "/history", label: "History", icon: History, matchPrefix: true },
];
