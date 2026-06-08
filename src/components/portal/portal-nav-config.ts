import { FolderKanban, LayoutDashboard, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefix?: boolean;
};

export const portalNavItems: PortalNavItem[] = [
  { href: "/portal/dashboard", label: "Overview", icon: LayoutDashboard },
  {
    href: "/portal/projects",
    label: "Projects",
    icon: FolderKanban,
    matchPrefix: true,
  },
  {
    href: "/portal/interactions",
    label: "Interactions",
    icon: MessageSquare,
    matchPrefix: true,
  },
];
