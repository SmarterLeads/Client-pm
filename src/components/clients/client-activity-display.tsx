"use client";

import {
  ACTIVITY_EVENT_CATEGORIES,
  type ActivityEventCategory,
} from "@/lib/clients/activity-log";
import { cn } from "@/lib/utils";
import {
  Building2,
  CheckSquare,
  Flag,
  FolderKanban,
  Megaphone,
  MessageSquare,
  Paperclip,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";

export const activityCategoryMeta: Record<
  ActivityEventCategory,
  {
    label: string;
    icon: LucideIcon;
    accentClass: string;
    dotClass: string;
  }
> = {
  client: {
    label: "Client changes",
    icon: Building2,
    accentClass:
      "border-blue-500/30 bg-blue-500/5 dark:border-blue-400/30 dark:bg-blue-500/10",
    dotClass: "bg-blue-500",
  },
  contact: {
    label: "Contact changes",
    icon: User,
    accentClass:
      "border-blue-500/30 bg-blue-500/5 dark:border-blue-400/30 dark:bg-blue-500/10",
    dotClass: "bg-blue-500",
  },
  project: {
    label: "Projects",
    icon: FolderKanban,
    accentClass:
      "border-purple-500/30 bg-purple-500/5 dark:border-purple-400/30 dark:bg-purple-500/10",
    dotClass: "bg-purple-500",
  },
  task: {
    label: "Tasks",
    icon: CheckSquare,
    accentClass:
      "border-purple-500/30 bg-purple-500/5 dark:border-purple-400/30 dark:bg-purple-500/10",
    dotClass: "bg-purple-500",
  },
  interaction: {
    label: "Interactions",
    icon: MessageSquare,
    accentClass:
      "border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-400/30 dark:bg-emerald-500/10",
    dotClass: "bg-emerald-500",
  },
  update: {
    label: "Updates",
    icon: Megaphone,
    accentClass:
      "border-orange-500/30 bg-orange-500/5 dark:border-orange-400/30 dark:bg-orange-500/10",
    dotClass: "bg-orange-500",
  },
  milestone: {
    label: "Milestones",
    icon: Flag,
    accentClass:
      "border-teal-500/30 bg-teal-500/5 dark:border-teal-400/30 dark:bg-teal-500/10",
    dotClass: "bg-teal-500",
  },
  file: {
    label: "Files",
    icon: Paperclip,
    accentClass:
      "border-amber-500/30 bg-amber-500/5 dark:border-amber-400/30 dark:bg-amber-500/10",
    dotClass: "bg-amber-500",
  },
  portal: {
    label: "Portal",
    icon: Shield,
    accentClass: "border-border bg-muted/30 dark:bg-muted/20",
    dotClass: "bg-muted-foreground",
  },
};

export const activityCategoryFilterOptions = ACTIVITY_EVENT_CATEGORIES.map(
  (category) => ({
    value: category,
    label: activityCategoryMeta[category].label,
  }),
);

export function ActivityCategoryIcon({
  category,
  className,
}: {
  category: ActivityEventCategory;
  className?: string;
}) {
  const Icon = activityCategoryMeta[category].icon;
  return <Icon className={cn("size-4 shrink-0", className)} aria-hidden />;
}
