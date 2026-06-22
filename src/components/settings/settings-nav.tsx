"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutTemplate, Settings, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/settings", label: "Overview", icon: Settings, exact: true },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/settings/account", label: "Account", icon: User },
] as const;

export function SettingsNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active =
          "exact" in link && link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
