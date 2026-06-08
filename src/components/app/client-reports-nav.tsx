"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AgencyReportClientGroup } from "@/lib/marketing/types";

type ClientReportsNavProps = {
  groups: AgencyReportClientGroup[];
};

export function ClientReportsNav({ groups }: ClientReportsNavProps) {
  const pathname = usePathname();
  const active = pathname.startsWith("/marketing/") && pathname !== "/marketing";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <BarChart2 className="size-5 shrink-0" aria-hidden />
        <span className="hidden flex-1 truncate text-left lg:inline">
          Client Reports
        </span>
        <ChevronDown className="hidden size-4 shrink-0 opacity-70 lg:inline" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        className="max-h-[min(24rem,70vh)] w-64 overflow-y-auto"
      >
        {groups.length === 0 ? (
          <DropdownMenuItem disabled>No clients with reports</DropdownMenuItem>
        ) : (
          groups.map((group, index) => (
            <DropdownMenuGroup key={group.agencyId}>
              {index > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel>{group.agencyName}</DropdownMenuLabel>
              {group.clients.map((client) => (
                <DropdownMenuItem
                  key={client.id}
                  render={<Link href={`/marketing/${client.reportSlug}`} />}
                >
                  {client.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
