import type { Notification, NotificationType } from "@/lib/types";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareQuote,
  ShieldAlert,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

const iconByType: Record<NotificationType, LucideIcon> = {
  task_assigned: UserPlus,
  task_due: CalendarClock,
  comment_mention: MessageSquareQuote,
  task_comment: MessageSquareQuote,
  task_complete: CheckCircle2,
  task_review: ClipboardCheck,
  milestone_due: CalendarClock,
  approval_needed: ShieldAlert,
  milestone_approved: ClipboardCheck,
};

export function getNotificationIcon(type: string | null | undefined): LucideIcon {
  if (!type) return Bell;
  return iconByType[type as NotificationType] ?? Bell;
}

export function getNotificationHref(notification: Notification): string | null {
  if (!notification.entity_id) return null;

  switch (notification.entity_type) {
    case "project":
      return `/projects/${notification.entity_id}`;
    case "client":
      return `/clients/${notification.entity_id}?tab=interactions`;
    case "task":
      return null;
    case "milestone":
      return `/projects?milestone=${notification.entity_id}`;
    case "email_log":
      return "/dashboard";
    default:
      return null;
  }
}

export function formatNotificationTime(iso: string | null | undefined): string {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
