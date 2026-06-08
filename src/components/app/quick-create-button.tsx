"use client";

import {
  CheckSquare,
  FolderPlus,
  MessageSquare,
  Plus,
  User,
  UserPlus,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  openQuickCreate,
  type QuickCreateType,
} from "@/lib/stores/quick-create-store";
import { cn } from "@/lib/utils";

const menuItems: {
  type: QuickCreateType;
  label: string;
  icon: typeof UserPlus;
}[] = [
  { type: "client", label: "Client", icon: UserPlus },
  { type: "contact", label: "Contact", icon: User },
  { type: "project", label: "Project", icon: FolderPlus },
  { type: "task", label: "Task", icon: CheckSquare },
  { type: "interaction", label: "Interaction", icon: MessageSquare },
];

export function QuickCreateButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-lg border border-emerald-600/20 px-2.5 text-sm font-medium",
          "bg-emerald-600 text-white hover:bg-emerald-700",
          "dark:bg-emerald-600 dark:hover:bg-emerald-700",
        )}
        aria-label="Add new"
      >
        <Plus className="size-4" />
        <span className="hidden sm:inline">Add New</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {menuItems.map((item) => (
          <DropdownMenuItem
            key={item.type}
            onClick={() => openQuickCreate(item.type)}
          >
            <item.icon className="size-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
